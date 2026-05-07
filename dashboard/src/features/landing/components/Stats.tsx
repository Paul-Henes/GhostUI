// Stats section - Social proof numbers
import { motion } from 'framer-motion'

const stats = [
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '50ms', label: 'Average scan time' },
  { value: '10k+', label: 'Issues fixed' },
  { value: '500+', label: 'Happy customers' },
]

export function Stats() {
  return (
    <section className="py-16 border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="text-3xl md:text-4xl font-semibold text-gray-900 mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
