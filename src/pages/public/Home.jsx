import React from "react";
import { Link } from "react-router-dom";
import { Navbar, Footer, PageMeta } from "../../components";
import content from "../../content";

export default function Home() {
  return (
    <div className="min-h-screen">
      <PageMeta
        title={content.meta.home.title}
        description={content.meta.home.description}
        url={content.meta.home.url}
      />
      <Navbar />

      {/* HERO */}
      <section className="bg-deep text-white py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute border border-teal rounded-full"
              style={{
                width: `${80 + i * 40}px`,
                height: `${80 + i * 40}px`,
                top: `${(i * 17) % 80}%`,
                left: `${(i * 23) % 90}%`,
                opacity: 0.3,
              }}
            />
          ))}
        </div>

        <div className="max-w-5xl mx-auto relative px-1 sm:px-0">
          <div className="inline-flex items-center gap-2 bg-teal/20 border border-teal/40 text-teal text-sm font-medium px-4 py-2 rounded-full mb-8">
            🏆 1st Place — WTP Green Sustainability Competition 2026
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6">
            {content.home.hero.headline.split(". ")[0]}. <br />
            <span className="text-white/70">
              {content.home.hero.headline.split(". ")[1] ||
                "We built the solution."}
            </span>
          </h1>

          <p className="text-base sm:text-xl text-white/70 max-w-2xl mb-8 sm:mb-10 leading-relaxed">
            {content.home.hero.sub}
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            <Link
              to="/product"
              className="btn-primary text-base justify-center"
            >
              Explore Product
            </Link>
            <Link to="/contact" className="btn-white text-base justify-center">
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-10 sm:py-12 bg-deep/95 overflow-x-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {content.home.stats.map(([val, lbl, src]) => (
            <div
              key={val}
              className="text-center py-6 px-3 border-l border-teal/30 first:border-l-0"
            >
              <div className="text-3xl font-black text-teal mb-1">{val}</div>
              <div className="text-white/80 text-sm font-medium whitespace-pre-line">
                {lbl}
              </div>
              <div className="text-white/40 text-xs mt-1">{src}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-label">The Bio-Digital Loop</div>
            <h2 className="text-3xl font-bold text-deep">How Tazémi Works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
            {content.home.steps.map(([n, t, b, icon]) => (
              <div key={n} className="card p-5 relative">
                <div className="w-8 h-8 rounded-full bg-teal flex items-center justify-center text-white font-black text-sm mb-3">
                  {n}
                </div>
                <div className="text-xl mb-2">{icon}</div>
                <div className="font-bold text-deep mb-2 text-sm">{t}</div>
                <div className="text-gray-600 text-xs leading-relaxed">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRACTION */}
      <section className="py-20 px-4 sm:px-6 bg-mist">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="section-label">Traction</div>
            <h2 className="text-3xl font-bold text-deep">Where We Are</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {content.home.traction.map(([icon, title, body]) => (
              <div key={title} className="card p-6">
                <div className="text-3xl mb-3">{icon}</div>
                <div className="font-bold text-deep mb-1">{title}</div>
                <div className="text-gray-600 text-sm">{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM PREVIEW */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <div className="section-label">The Team</div>
              <h2 className="text-3xl font-bold text-deep">
                Built by builders
              </h2>
            </div>
            <Link
              to="/team"
              className="text-teal font-semibold text-sm hover:underline"
            >
              Meet everyone →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {content.home.teamPreview.map((m) => (
              <div key={m.name} className="card p-6 flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-deep flex items-center justify-center text-teal font-black text-lg shrink-0">
                  {m.initials}
                </div>
                <div>
                  <div className="font-bold text-deep">{m.name}</div>
                  <div className="text-teal text-sm font-medium mb-2">
                    {m.role}
                  </div>
                  <div className="text-gray-600 text-sm">{m.bio}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 bg-deep text-white">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">Explore the platform</h2>
            <p className="text-white/70 mb-6">
              See the Bio-Shield coating operation, IoT monitoring, R&amp;D
              trials, and data analysis — all in one dashboard.
            </p>
            <Link to="/contact" className="btn-primary">
              Contact Us →
            </Link>
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-4">Get in touch</h2>
            <p className="text-white/70 mb-6">
              Investment enquiries, grant partnerships, or pilot partnerships —
              we'd like to hear from you.
            </p>
            <Link to="/contact" className="btn-white">
              Contact Us →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
