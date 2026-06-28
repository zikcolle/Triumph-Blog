/**
 * TRYUMPH MAGAZINE - BLOGGER FEED ENGINE
 */

const BLOGGER_CONFIG = {
    blogId: "tryumphmagazine",
    blogUrl: "https://tryumphmagazine.blogspot.com",
    feedUrl: "https://tryumphmagazine.blogspot.com/feeds/posts/default?alt=json",
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
    const path = label
        ? `/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=${BLOGGER_CONFIG.maxResults}`
        : `/feeds/posts/default?alt=json&max-results=${BLOGGER_CONFIG.maxResults}`;

    // Try direct Blogger feed
    try {
        const directUrl = `${BLOGGER_CONFIG.blogUrl}${path}`;
        const response = await fetch(directUrl);
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

async function getBloggerPostById(postId) {
    const posts = await getBloggerPosts();
    return posts.find(p => String(p.id) === String(postId)) || null;
}