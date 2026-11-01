import { formatNewsDate, type NewsPost } from "@/lib/news";

export function NewsCard({ post }: { post: NewsPost }) {
  return (
    <article className="news-card">
      <a href={post.path} className="news-card-link">
        <div className="news-card-visual" aria-hidden="true">
          {post.image ? (
            <img src={post.image} alt="" loading="lazy" width={600} height={338} />
          ) : (
            <span className="news-card-tag">{post.category ?? post.tags[0] ?? "Seminai"}</span>
          )}
        </div>
        <div className="news-card-body">
          <time dateTime={post.date} className="news-card-date">
            {formatNewsDate(post.date, post.lang)}
          </time>
          <h3>{post.title}</h3>
          <p>{post.description}</p>
        </div>
      </a>
    </article>
  );
}
