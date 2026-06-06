import React from "react";
import { Navbar, Footer, PageMeta } from "../../components";
import content from "../../content";

export default function Impact() {
  return (
    <div>
      <PageMeta
        title={content.meta.impact.title}
        description={content.meta.impact.description}
        url={content.meta.impact.url}
      />
      <Navbar />
      <section className="bg-deep text-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="section-label text-teal">
            {content.impact.hero.label}
          </div>
          <h1 className="text-4xl font-black mb-4">
            {content.impact.hero.title}
          </h1>
          <p className="text-white/70">{content.impact.hero.subtitle}</p>
        </div>
      </section>
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {content.impact.metrics.map((metric) => (
              <div
                key={metric.label}
                className="bg-deep text-white rounded-xl p-6"
              >
                <div className="text-xs font-bold uppercase tracking-widest text-teal/70 mb-2">
                  {metric.category}
                </div>
                <div className="text-2xl font-black text-teal mb-2">
                  {metric.value}
                </div>
                <div className="text-white/70 text-sm">{metric.label}</div>
              </div>
            ))}
          </div>
          <div className="section-label mb-4">SDG Alignment</div>
          <div className="grid sm:grid-cols-2 gap-5">
            {content.impact.sdgs.map((item) => (
              <div
                key={item.title}
                className="border-l-4 border-teal pl-5 py-3"
              >
                <div className="font-bold text-deep text-sm mb-1">
                  {item.title}
                </div>
                <p className="text-gray-600 text-sm">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
