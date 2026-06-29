/**
 * TRYUMPH MAGAZINE - BLOGGER FEED ENGINE
 */

const BLOGGER_CONFIG = {
    blogId: "tryumphmagazine",
    blogUrl: "https://tryumphmagazine.blogspot.com",
    // 1. Change feedUrl to use a relative path for the Vercel rewrite engine
    feedUrl: "/feeds/posts/default",
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
        image: firstImage ? firstImage.replace(/\/s\d+-c\//, '/s800-c/').replace(/=s\d+$/, '=s800') : PLACEHOLDER_IMAGE,
        summary: summary.replace(/<[^>]*>/g, '').trim() || content.replace(/<[^>]*>/g, '').trim().slice(0, 180),
        body: content,
        link: ''
    };
}

async function getBloggerPosts(label = "") {
    // 2. Build paths relatively to use Vercel's server rewrites
    // Build paths relatively to use Vercel's server rewrites with explicit JSON instructions
const path = label
    ? `/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=${BLOGGER_CONFIG.maxResults}`
    : `/feeds/posts/default?alt=json&max-results=${BLOGGER_CONFIG.maxResults}`;


    try {
        // This will now request 'https://vercel.app...'
        // Vercel intercepts this request, grabs the blogger feed, and returns it bypass-CORS.
        const response = await fetch(path); 
        if (!response.ok) throw new Error(`Blogger feed error ${response.status}`);
        const data = await response.json();
        const entries = data.feed?.entry || [];
        const posts = entries.map((entry, idx) => parseBloggerPost(entry, idx));
        if (posts.length > 0) {
            localStorage.setItem('blogger_posts_cache', JSON.stringify(posts));
            console.log(`✅ Blogger feed loaded: ${posts.length} posts`);
            return posts;
        }
    } catch (error) {
        console.warn("Blogger feed fetch failed, trying fallback:", error.message);
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
                // 3. Removed the restriction blocking your 'postiman' image file path string
                image: p.image ? p.image : PLACEHOLDER_IMAGE, 
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
