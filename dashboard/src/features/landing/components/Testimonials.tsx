// Testimonials section
import { motion } from 'framer-motion'

const testimonials = [
  {
    quote: "Ghost-UI found accessibility issues our previous tools completely missed. The AI suggestions saved us weeks of manual work.",
    author: "Sarah Chen",
    role: "Head of Engineering",
    company: "TechCorp",
  },
  {
    quote: "Finally, an accessibility tool that developers actually want to use. The fix suggestions are spot-on.",
    author: "Marcus Johnson",
    role: "Frontend Lead",
    company: "StartupXYZ",
  },
  {
    quote: "We went from 47 accessibility issues to full WCAG compliance in just two days. Incredible.",
    author: "Lisa Müller",
    role: "Product Manager",
    company: "DigitalAgency",
  },
]

export function Testimonials() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-sm font-medium text-primary-600 uppercase tracking-wider mb-4 block">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900">
            Trusted by teams that care
          </h2>
        </motion.div>

        {/* Testimonial Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="bg-gray-50 rounded-2xl p-8"
            >
              {/* Quote */}
              <p className="text-gray-600 leading-relaxed mb-6">
                "{testimonial.quote}"
              </p>
              
              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">
                    {testimonial.author}
                  </div>
                  <div className="text-xs text-gray-500">
                    {testimonial.role}, {testimonial.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
