import { newsLabel, type NewsPost } from "@/lib/news";

/** Magazine card: photo, label, title, a short rule, the opening of the article. */
export function NewsCard({ post }: { post: NewsPost }) {
  const label = newsLabel(post);

  return (
    <article className="news-card">
      <a href={post.path} className="news-card-link">
        <div className="news-card-visual" aria-hidden="true">
          {post.image ? (
            <img src={post.image} alt="" loading="lazy" width={600} height={400} />
          ) : null}
        </div>
        <p className="news-card-label">{label}</p>
        <h3>{post.title}</h3>
        <span className="news-card-rule" aria-hidden="true" />
        <p className="news-card-excerpt">{post.excerpt || post.description}</p>
      </a>
    </article>
  );
}
