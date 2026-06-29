/**
 * TRYUMPH MAGAZINE - OFFICIAL BLOGGER API V3 ENGINE
 */

const BLOGGER_CONFIG = {
    // 1. Paste your numeric dashboard Blog ID numbers below
    blogId: "329335801735011867", 
    
    // 2. Paste your Google Cloud API Key string below
    apiKey: "AIzaSyD4aGRFU7OrGML4W2jqrtRmkccDZz1tlPU",
    
    maxResults: 500
};

const PLACEHOLDER_IMAGE = 'assets/placeholder.svg';

function parseBloggerPost(post) {
    const content = post.content || '';
    const title = post.title || 'Untitled Post';
    const categories = post.labels || [];
    
    // Regex scans post body HTML string to parse the first available image tag source
    const firstImage = content.match(/<img[^>]+src=['"]([^'"]+)['"]/i)?.[1] || '';
    const published = post.published || post.updated || '';
    const author = post.author?.displayName || 'Author';

    return {
        id: post.id,
        title,
        category: categories[0] || 'personal-finance',
        tags: categories,
        author,
        authorBio: '',
        authorLink: 'about.html',
        date: published
            ? new Date(published).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            : new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        // Scale imagery parameters up cleanly to 800px resolution boundaries instead of tiny thumbnails
        image: firstImage ? firstImage.replace(/\/s\d+-c\//, '/s800-c/').replace(/=s\d+$/, '=s800') : PLACEHOLDER_IMAGE,
        summary: content.replace(/<[^>]*>/g, '').trim().slice(0, 180),
        body: content,
        link: post.url || ''
    };
}

async function getBloggerPosts(label = "") {
    // Structural v3 API URL assembly parameters targeting official public REST endpoints
    let url = `https://googleapis.com{BLOGGER_CONFIG.blogId}/posts?key=${BLOGGER_CONFIG.apiKey}&maxResults=${BLOGGER_CONFIG.maxResults}`;
    
    if (label) {
        url += `&labels=${encodeURIComponent(label)}`;
    }

    try {
        const response = await fetch(url); 
        if (!response.ok) throw new Error(`Google API network fault status: ${response.status}`);
        
        const data = await response.json();
        const items = data.items || [];
        const posts = items.map(post => parseBloggerPost(post));
        
        console.log(`✅ Official Blogger v3 Feed loaded: ${posts.length} live articles.`);
        return posts;
        
    } catch (error) {
        console.warn("⚠️ API fetch halted. Routing traffic cleanly into local backups instead:", error.message);
    }

    // Secondary local fallback path layer maps to posts.json database file structure
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
                image: p.image ? p.image : PLACEHOLDER_IMAGE, 
                summary: p.summary || '',
                body: p.body || '',
                link: ''
            }));
            
            console.log(`📄 Local JSON dataset loaded fallback backup: ${posts.length} posts`);
            return label ? posts.filter(p => p.category === label) : posts;
        }
    } catch (e) {
        console.error("❌ Fallback system pipeline exhausted:", e.message);
    }

    return [];
}

async function getBloggerPostById(postId) {
    const posts = await getBloggerPosts();
    return posts.find(p => String(p.id) === String(postId)) || null;
}
