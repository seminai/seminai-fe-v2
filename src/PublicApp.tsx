import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
const Home = lazy(() => import("./routes/Home"));
const PrivacyPolicy = lazy(() => import("./routes/PrivacyPolicy"));
const CookiePolicy = lazy(() => import("./routes/CookiePolicy"));
const TermsOfService = lazy(() => import("./routes/TermsOfService"));
const NewsIndex = lazy(() => import("./routes/News/NewsIndex"));
const NewsArticle = lazy(() => import("./routes/News/NewsArticle"));
import { PUBLIC_PAGES } from "./config/publicPages";
const PublicPage = lazy(() =>
  import("./routes/Public/PublicPage").then((module) => ({
    default: module.PublicPage,
  })),
);
const DemoPage = lazy(() =>
  import("./routes/Public/PublicPage").then((module) => ({
    default: module.DemoPage,
  })),
);
const NotFound = lazy(() =>
  import("./routes/Public/NotFound").then((module) => ({
    default: module.NotFound,
  })),
);

export default function PublicApp() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/en" element={<Home />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/cookie-policy" element={<CookiePolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/news" element={<NewsIndex lang="it" />} />
      <Route path="/news/:slug" element={<NewsArticle lang="it" />} />
      <Route path="/en/news" element={<NewsIndex lang="en" />} />
      <Route path="/en/news/:slug" element={<NewsArticle lang="en" />} />
      <Route path="/richiedi-demo" element={<DemoPage lang="it" />} />
      <Route path="/en/request-a-demo" element={<DemoPage lang="en" />} />
      {PUBLIC_PAGES.map((page) => (
        <Route
          key={page.path}
          path={page.path}
          element={<PublicPage page={page} />}
        />
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
