import { useState } from "react";
import { Navbar, Footer, PageMeta } from "../../components";
import { send } from "@emailjs/browser";
import content from "../../content";

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    org: "",
    email: "",
    subject: "Investment Enquiry",
    message: "",
  });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.message) {
      setError("Please fill name, email and message.");
      return;
    }
    setSending(true);

    const templateParams = {
      from_name: form.name,
      from_org: form.org || "-",
      reply_to: form.email,
      subject: form.subject,
      message: form.message,
    };

    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
      console.warn("EmailJS env vars not set. Skipping send.");
      setSending(false);
      setSent(true);
      return;
    }

    try {
      await send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      setSent(true);
    } catch (err) {
      console.error(err);
      setError("Failed to send message. Please try again later.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageMeta
        title={content.meta.contact.title}
        description={content.meta.contact.description}
        url={content.meta.contact.url}
      />
      <Navbar />
      <section className="bg-deep text-white py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="section-label text-teal">
            {content.contact.hero.label}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-4">
            {content.contact.hero.title}
          </h1>
          <p className="text-white/70 text-lg">
            {content.contact.hero.subtitle}
          </p>
        </div>
      </section>
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="section-label">Contact Details</div>
            <div className="space-y-4 mt-4">
              {content.contact.details.map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">
                      {item.label}
                    </div>
                    <div className="font-medium text-deep text-sm">
                      {item.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            {sent ? (
              <div className="bg-mist rounded-xl p-8 text-center">
                <div className="text-4xl mb-4">✅</div>
                <div className="font-bold text-deep text-xl mb-2">
                  {content.contact.success.title}
                </div>
                <p className="text-gray-600">
                  {content.contact.success.subtitle}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-deep block mb-1">
                      Name *
                    </label>
                    <input
                      required
                      value={form.name}
                      onChange={set("name")}
                      className="input"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-deep block mb-1">
                      Organisation
                    </label>
                    <input
                      value={form.org}
                      onChange={set("org")}
                      className="input"
                      placeholder="Company / Fund / Organisation"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-deep block mb-1">
                    Email *
                  </label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    className="input"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-deep block mb-1">
                    Subject
                  </label>
                  <select
                    value={form.subject}
                    onChange={set("subject")}
                    className="input"
                  >
                    {[
                      "Investment Enquiry",
                      "Grant Partnership",
                      "Pilot Partnership",
                      "General",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-deep block mb-1">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={set("message")}
                    className="input resize-none"
                    placeholder="Tell us about your interest..."
                  />
                </div>
                {error && (
                  <div className="text-sm text-tomato font-medium">{error}</div>
                )}
                <button
                  type="submit"
                  disabled={sending}
                  className={`btn-primary w-full justify-center ${sending ? "opacity-70 cursor-wait" : ""}`}
                >
                  {sending ? "Sending…" : "Send Message →"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
