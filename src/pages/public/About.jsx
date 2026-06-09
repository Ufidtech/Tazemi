import React from "react";
import { Navbar, Footer, PageMeta } from "../../components";
import content from "../../content";

export default function About() {
  return (
    <div>
      <PageMeta
        title={content.meta.about.title}
        description={content.meta.about.description}
        url={content.meta.about.url}
      />
      <Navbar />
      <section className="bg-deep text-white py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="section-label text-teal">
            {content.about.hero.label}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-4">
            {content.about.hero.title}
          </h1>
          <p className="text-white/70 text-xl">{content.about.hero.subtitle}</p>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="section-label">{content.about.mission.label}</div>
            <h2 className="text-3xl font-bold text-deep mb-4">
              {content.about.mission.title}
            </h2>
            {content.about.mission.paragraphs.map((paragraph, index) => (
              <p key={index} className="text-gray-600 leading-relaxed mb-4">
                {paragraph}
              </p>
            ))}
          </div>
          <div className="bg-mist rounded-2xl p-8">
            <div className="text-5xl mb-4">🌱</div>
            <div className="font-bold text-deep text-xl mb-2">
              {content.about.meaning.title}
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              {content.about.meaning.details.map((item, index) => (
                <span key={item.label}>
                  <strong>{item.label}</strong> {item.value}
                  {index < content.about.meaning.details.length - 1 ? (
                    <br />
                  ) : null}
                </span>
              ))}
              <br />
              <br />
              {content.about.meaning.copy}
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-mist">
        <div className="max-w-4xl mx-auto">
          <div className="section-label">{content.about.concept.label}</div>
          <h2 className="text-3xl font-bold text-deep mb-8">
            {content.about.concept.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {content.about.concept.cards.map((card) => (
              <div key={card.title} className="card p-6">
                <div className="text-3xl mb-3">{card.icon}</div>
                <div className="font-bold text-deep mb-2">{card.title}</div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {card.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="section-label">Values</div>
          <h2 className="text-3xl font-bold text-deep mb-8">How we operate</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {content.about.values.map((item) => (
              <div
                key={item.title}
                className="border-l-4 border-teal pl-5 py-2"
              >
                <div className="font-bold text-deep mb-1">{item.title}</div>
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
