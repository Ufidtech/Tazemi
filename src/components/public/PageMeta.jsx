import { useEffect } from "react";

export function PageMeta({ title, description, url, image }) {
  useEffect(() => {
    if (title) document.title = title;

    const setMeta = (selector, attr, value) => {
      let element = document.head.querySelector(selector);
      if (!element) {
        const tag = selector.startsWith("meta") ? "meta" : "link";
        element = document.createElement(tag);
        if (selector.includes("[name='")) {
          element.setAttribute("name", selector.match(/name='(.+?)'/)[1]);
        } else if (selector.includes("[property='")) {
          element.setAttribute(
            "property",
            selector.match(/property='(.+?)'/)[1],
          );
        } else if (selector.includes("[rel='")) {
          element.setAttribute("rel", selector.match(/rel='(.+?)'/)[1]);
        }
        document.head.appendChild(element);
      }
      element.setAttribute(attr, value);
    };

    if (description)
      setMeta("meta[name='description']", "content", description);
    if (title) {
      setMeta("meta[property='og:title']", "content", title);
      setMeta("meta[name='twitter:title']", "content", title);
    }
    if (description) {
      setMeta("meta[property='og:description']", "content", description);
      setMeta("meta[name='twitter:description']", "content", description);
    }
    if (url) setMeta("link[rel='canonical']", "href", url);
    if (image) {
      setMeta("meta[property='og:image']", "content", image);
      setMeta("meta[name='twitter:image']", "content", image);
      setMeta("meta[name='twitter:card']", "content", "summary_large_image");
    } else {
      setMeta("meta[name='twitter:card']", "content", "summary_large_image");
    }
  }, [title, description, url, image]);

  return null;
}
