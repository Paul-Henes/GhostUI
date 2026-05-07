// Capabilities section - Bento grid
import { motion } from 'framer-motion'

const capabilities = [
  {
    title: 'WCAG 2.1 Coverage',
    description: 'Full coverage of all WCAG 2.1 Level A and AA success criteria.',
    size: 'large',
  },
  {
    title: 'EAA Compliance',
    description: 'Ready for the European Accessibility Act deadline.',
    size: 'small',
  },
  {
    title: 'Multi-page Scanning',
    description: 'Scan entire websites, not just single pages.',
    size: 'small',
  },
  {
    title: 'AI-Powered Analysis',
    description: 'Our AI understands context and provides smarter recommendations than rule-based tools.',
    size: 'large',
  },
]

export function Capabilities() {
  return (
    <section className="py-24 bg-gray-50/50">
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
            Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-4">
            Everything you need for compliance
          </h2>
          <p className="text-lg text-gray-500">
            Comprehensive accessibility testing with intelligent automation.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {capabilities.map((cap, index) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`group relative rounded-2xl border border-gray-200 bg-white p-8 hover:border-gray-300 hover:shadow-lg transition-all ${
                cap.size === 'large' ? 'md:col-span-1 row-span-1' : ''
              }`}
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {cap.title}
              </h3>
              <p className="text-gray-500 leading-relaxed">
                {cap.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
