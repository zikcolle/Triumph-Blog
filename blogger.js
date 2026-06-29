/**
 * TRYUMPH MAGAZINE - BLOGGER FEED ENGINE
 */

const BLOGGER_CONFIG = {
    blogId: "tryumphmagazine",
    blogUrl: "https://tryumphmagazine.blogspot.com",
    maxResults: 500
};

const PLACEHOLDER_IMAGE = 'assets/placeholder.svg';

function parseBloggerPost(entry, index) {
    const content = entry.content?.$t || '';
    const summary = entry.summary?.$t || '';
    const title = entry.title?.$t || 'Untitled Post';
    const categories = (entry.category || []).map(item => item.term).filter(Boolean);
    const firstImage = content.match(/<img[^>]+src=['"]([^'"]+)['"]/i)?.[1] || '';
    const published = entry.published?.$t || entry.updated?.$t || '';
    const author = entry.author?.[0]?.name?.$t || 'Author';

    let id = `blogger-${index + 1}`;
    if (entry.id?.$t) {
        const parts = entry.id.$t.split('.post-');
        id = parts.length > 1 ? parts[1] : entry.id.$t;
    }

    return {
        id,
        title,
        category: categories[0] || 'personal-finance',
        tags: categories,
        author,
        authorBio: '',
        authorLink: 'about.html',
        date: published
            ? new Date(published).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            : new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        image: firstImage
            ? firstImage.replace(/\/s\d+-c\//, '/s800-c/').replace(/=s\d+$/, '=s800')
            : PLACEHOLDER_IMAGE,
        summary: summary.replace(/<[^>]*>/g, '').trim() || content.replace(/<[^>]*>/g, '').trim().slice(0, 180),
        body: content,
        link: ''
    };
}

async function getBloggerPosts(label = "") {
    // JSONP — bypasses CORS on Vercel and all browsers
    try {
        const posts = await new Promise((resolve, reject) => {
            const basePath = label
                ? `/feeds/posts/default/-/${encodeURIComponent(label)}`
                : `/feeds/posts/default`;

            const callbackName = `bloggerCallback_${Date.now()}`;
            const script = document.createElement('script');
            const url = `${BLOGGER_CONFIG.blogUrl}${basePath}?alt=json-in-script&max-results=${BLOGGER_CONFIG.maxResults}&callback=${callbackName}`;

            const timeout = setTimeout(() => {
                delete window[callbackName];
                if (document.body.contains(script)) document.body.removeChild(script);
                reject(new Error('JSONP timeout'));
            }, 10000);

            window[callbackName] = (data) => {
                clearTimeout(timeout);
                delete window[callbackName];
                if (document.body.contains(script)) document.body.removeChild(script);
                const entries = data.feed?.entry || [];
                resolve(entries.map((entry, idx) => parseBloggerPost(entry, idx)));
            };

            script.src = url;
            script.onerror = () => {
                clearTimeout(timeout);
                delete window[callbackName];
                if (document.body.contains(script)) document.body.removeChild(script);
                reject(new Error('JSONP script load failed'));
            };
            document.body.appendChild(script);
        });

        if (posts.length > 0) {
            localStorage.setItem('blogger_posts_cache', JSON.stringify(posts));
            console.log(`✅ Blogger feed loaded via JSONP: ${posts.length} posts`);
            return posts;
        }
    } catch (error) {
        console.warn("Blogger JSONP fetch failed, trying fallback:", error.message);
    }

    // Local fallback: posts.json
    try {
        const response = await fetch('posts.json');
        if (response.ok) {
            const data = await response.json();
            const rawPosts = data.articles || data;
            const posts = rawPosts.map((p, idx) => ({
                id: p.id || `local-${idx}`,
                title: p.title || '',
                category: p.category || 'personal-finance',
                tags: Array.isArray(p.tags) ? p.tags : [],
                author: p.author || 'Zikcolle',
                authorBio: p.authorBio || '',
                authorLink: p.authorLink || 'about.html',
                date: p.date || 'Jun 28, 2026',
                image: p.image && !p.image.includes('postiman') ? p.image : PLACEHOLDER_IMAGE,
                summary: p.summary || '',
                body: p.body || '',
                link: ''
            }));
            console.log(`📄 Local posts.json fallback: ${posts.length} posts`);
            return label ? posts.filter(p => p.category === label) : posts;
        }
    } catch (e) {
        console.warn("Local fallback failed:", e.message);
    }

    // LocalStorage cache fallback
    try {
        const cached = localStorage.getItem('blogger_posts_cache');
        if (cached) {
            const posts = JSON.parse(cached);
            console.log(`💾 Using cached posts: ${posts.length}`);
            return label ? posts.filter(p => p.category === label) : posts;
        }
    } catch (e) {
        console.warn("Cache read failed:", e.message);
    }

    return [];
}

async function getBloggerPostById(postId) {
    const posts = await getBloggerPosts();
    return posts.find(p => String(p.id) === String(postId)) || null;
}