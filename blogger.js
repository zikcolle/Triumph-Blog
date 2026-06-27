/**
 * TRYUMPH MAGAZINE - BLOGGER FEED ENGINE
 */

const BLOGGER_CONFIG = {
    blogId: "tryumphmagazine",
    blogUrl: "https://tryumphmagazine.blogspot.com",
    feedUrl: "https://tryumphmagazine.blogspot.com/feeds/posts/default?alt=json",
    maxResults: 50
};

// SVG placeholder used when a post has no image
const PLACEHOLDER_IMAGE = 'assets/placeholder.svg';

// Helper to normalize Blogger entries into a standard Article structure
function parseBloggerPost(entry, index) {
    const content = entry.content?.$t || '';
    const summary = entry.summary?.$t || '';
    const title = entry.title?.$t || 'Untitled Post';
    const categories = (entry.category || []).map(item => item.term).filter(Boolean);
    const firstImage = content.match(/<img[^>]+src=['"]([^'"]+)['"]/i)?.[1] || '';
    const published = entry.published?.$t || entry.updated?.$t || '';
    const author = entry.author?.[0]?.name?.$t || 'Author';
    const alternateLink = (entry.link || []).find(link => link.rel === 'alternate')?.href || '';

    // Extract a clean string ID from Blogger's tag URI
    // e.g. "tag:blogger.com,1999:blog-12345.post-67890" -> "67890"
    let id = `blogger-${index + 1}`;
    if (entry.id?.$t) {
        const parts = entry.id.$t.split('.post-');
        if (parts.length > 1) {
            id = parts[1];
        } else {
            id = entry.id.$t;
        }
    }

    return {
        id: id,
        title: title,
        category: categories[0] || 'personal-finance',
        tags: categories,
        author: author,
        authorBio: '',
        authorLink: 'about.html',   // Always open author on local site, not Blogger
        date: published
            ? new Date(published).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            : new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        image: firstImage || PLACEHOLDER_IMAGE,
        summary: summary.replace(/<[^>]*>/g, '').trim() || content.replace(/<[^>]*>/g, '').trim().slice(0, 180),
        body: content,
        link: ''   // Always blank – we never redirect to Blogger
    };
}

// Fetch posts (optionally filtered by category/label)
async function getBloggerPosts(label = "") {
    // Build the proxy path – pass label filter through to the upstream URL
    const path = label
        ? `/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=${BLOGGER_CONFIG.maxResults}`
        : `/feeds/posts/default?alt=json&max-results=${BLOGGER_CONFIG.maxResults}`;

    try {
        const proxyUrl = `http://localhost:3002${path}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Blogger proxy error ${response.status}`);
        const data = await response.json();
        const entries = data.feed?.entry || [];
        const posts = entries.map((entry, idx) => parseBloggerPost(entry, idx));
        if (posts.length > 0) {
            localStorage.setItem('blogger_posts_cache', JSON.stringify(posts));
            console.log(`✅ Blogger feed loaded: ${posts.length} posts`);
            return posts;
        }
    } catch (error) {
        console.warn("Blogger proxy fetch failed, trying local fallback:", error.message);
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
                date: p.date || 'June 22, 2026',
                image: p.image && !p.image.includes('postiman') ? p.image : PLACEHOLDER_IMAGE,
                summary: p.summary || '',
                body: p.body || '',
                link: ''   // Never redirect to external URL
            }));
            if (label) {
                return posts.filter(p => p.category === label);
            }
            console.log(`📄 Local posts.json fallback: ${posts.length} posts`);
            return posts;
        }
    } catch (e) {
        console.warn("Local fallback fetch failed too:", e.message);
    }

    // LocalStorage cache fallback
    const cached = localStorage.getItem('blogger_posts_cache');
    if (cached) {
        const posts = JSON.parse(cached);
        console.log(`💾 Using cached posts: ${posts.length}`);
        if (label) {
            return posts.filter(p => p.category === label);
        }
        return posts;
    }

    return [];
}

// Fetch single post by ID
async function getBloggerPostById(postId) {
    const posts = await getBloggerPosts();
    return posts.find(p => String(p.id) === String(postId)) || null;
}
