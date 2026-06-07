import React from "react";
import { Navbar, Footer, PageMeta } from "../../components";
// import { team } from "../../services/demoData";
import { team } from "../../data/index.js";
import content from "../../content";

export default function Team() {
  return (
    <div>
      <PageMeta
        title={content.meta.team.title}
        description={content.meta.team.description}
        url={content.meta.team.url}
      />
      <Navbar />
      <section className="bg-deep text-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="section-label text-teal">
            {content.teamContent.hero.label}
          </div>
          <h1 className="text-4xl font-black mb-4">
            {content.teamContent.hero.title}
          </h1>
          <p className="text-white/70 text-lg">
            {content.teamContent.hero.subtitle}
          </p>
        </div>
      </section>
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-6">
            {team.map((m) => (
              <div key={m.name} className="card p-6 flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${m.role.includes("Founder") ? "bg-deep text-teal" : "bg-mist text-deep"}`}
                >
                  {m.initials}
                </div>
                <div>
                  <div className="font-bold text-deep">{m.name}</div>
                  <div className="text-teal text-sm font-semibold mb-1">
                    {m.role}
                  </div>
                  <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide">
                    {m.dept}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {m.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
