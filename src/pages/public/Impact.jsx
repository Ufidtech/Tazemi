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

      <section className="bg-deep text-white py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="section-label text-teal">
            {content.impact.hero.label}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-4">
            {content.impact.hero.title}
          </h1>
          <p className="text-white/70 text-lg">
            {content.impact.hero.subtitle}
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {content.impact.metrics.map((metric) => (
              <div key={metric.label} className="card p-6">
                <div className="text-xs uppercase tracking-wide text-teal font-semibold mb-2">
                  {metric.category}
                </div>
                <div className="text-3xl font-black text-deep mb-2">
                  {metric.value}
                </div>
                <div className="text-gray-600 text-sm">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-mist">
        <div className="max-w-4xl mx-auto">
          <div className="section-label">SDG Alignment</div>
          <h2 className="text-2xl font-bold text-deep mb-6">
            Where the impact lands
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {content.impact.sdgs.map((sdg) => (
              <div key={sdg.title} className="card p-6">
                <div className="font-bold text-teal mb-2">{sdg.title}</div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {sdg.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
