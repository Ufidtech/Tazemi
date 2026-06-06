import React from "react";
import { Navbar, Footer, PageMeta } from "../../components";
import content from "../../content";

export default function Investors() {
  return (
    <div>
      <PageMeta
        title={content.meta.investors.title}
        description={content.meta.investors.description}
        url={content.meta.investors.url}
      />
      <Navbar />
      <section className="bg-deep text-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="section-label text-teal">
            {content.investors.hero.label}
          </div>
          <h1 className="text-4xl font-black mb-4">
            {content.investors.hero.title}
          </h1>
          <p className="text-white/70 text-lg">
            {content.investors.hero.subtitle}
          </p>
        </div>
      </section>
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {content.investors.resources.map((resource) => (
              <div key={resource.title} className="card p-6 text-center">
                <div className="text-4xl mb-4">{resource.icon}</div>
                <div className="font-bold text-deep mb-2">{resource.title}</div>
                <p className="text-gray-600 text-sm mb-4">
                  {resource.description}
                </p>
                <a
                  href="mailto:hello@tazemi.com"
                  className="btn-secondary text-sm"
                >
                  Request: {resource.action}
                </a>
              </div>
            ))}
          </div>
          <div className="section-label mb-6">
            Competition Wins & Recognition
          </div>
          <div className="card overflow-hidden">
            <div className="card-header">Traction</div>
            <div className="p-6 space-y-4">
              {content.investors.traction.map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <span className="text-3xl">{item.icon}</span>
                  <div>
                    <div className="font-bold text-deep">{item.title}</div>
                    <div className="text-gray-600 text-sm mt-1">
                      {item.copy}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
