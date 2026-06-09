import React from "react";
import { Navbar, Footer, PageMeta } from "../../components";
import content from "../../content";

export default function Product() {
  return (
    <div>
      <PageMeta
        title={content.meta.product.title}
        description={content.meta.product.description}
        url={content.meta.product.url}
      />
      <Navbar />
      <section className="bg-deep text-white py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="section-label text-teal">
            {content.product.hero.label}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-4">
            {content.product.hero.title}
          </h1>
          <p className="text-white/70 text-lg">
            {content.product.hero.subtitle}
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-12 text-sm text-amber-800">
            <strong>Validation status:</strong>{" "}
            {content.product.validation.notice}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <div>
              <div className="section-label">
                {content.product.formulation.label}
              </div>
              <h2 className="text-2xl font-bold text-deep mb-4">
                {content.product.formulation.title}
              </h2>
              <div className="space-y-4">
                {content.product.formulation.ingredients.map((ingredient) => (
                  <div key={ingredient.name} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-teal mt-2 shrink-0" />
                    <div>
                      <div className="font-semibold text-deep text-sm">
                        {ingredient.name}
                      </div>
                      <p className="text-gray-600 text-sm">{ingredient.copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-mist rounded-2xl p-8">
              <div className="section-label">
                {content.product.trials.label}
              </div>
              <div className="space-y-4 mt-3">
                {content.product.trials.items.map((item) => (
                  <div
                    key={item.metric}
                    className="flex justify-between items-start border-b border-teal/20 pb-3"
                  >
                    <span className="text-gray-600 text-sm">{item.metric}</span>
                    <div className="text-right">
                      <div className="font-bold text-deep text-sm">
                        {item.value}
                      </div>
                      <div className="text-xs text-teal">{item.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-mist">
        <div className="max-w-4xl mx-auto">
          <div className="section-label">
            {content.product.literature.label}
          </div>
          <h2 className="text-2xl font-bold text-deep mb-6">
            {content.product.literature.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {content.product.literature.citations.map((citation) => (
              <div key={citation.title} className="card p-5">
                <div className="font-bold text-teal text-sm mb-1">
                  {citation.title}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {citation.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="section-label">{content.product.iot.label}</div>
          <h2 className="text-2xl font-bold text-deep mb-8">
            {content.product.iot.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {content.product.iot.sensors.map((sensor) => (
              <div key={sensor.title} className="card p-5">
                <div className="text-2xl mb-2">{sensor.icon}</div>
                <div className="font-bold text-deep text-sm mb-1">
                  {sensor.title}
                </div>
                <p className="text-gray-500 text-xs">{sensor.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-deep text-white">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8 text-center">
          {content.product.caas.values.map((item) => (
            <div key={item.label}>
              <div className="text-3xl font-black text-teal mb-2">
                {item.value}
              </div>
              <div className="text-white/70 text-sm">{item.label}</div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
