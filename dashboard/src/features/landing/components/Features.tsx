// Features section - Clean template-style cards
import { motion } from 'framer-motion'

const features = [
  {
    label: 'Instant visibility. Instant action.',
    title: 'Real-time Scanning',
    description: 'Suspicious accessibility issues get flagged the second they appear. No lag. No noise.',
    gradient: 'from-blue-500 to-cyan-400',
  },
  {
    label: 'See everything. Miss nothing.',
    title: 'Zero Blind Spots',
    description: 'Full visibility into every element, contrast ratio, and ARIA label. If it affects users, we see it.',
    gradient: 'from-violet-500 to-purple-400',
  },
  {
    label: 'Fix issues in seconds.',
    title: 'AI-Powered Fixes',
    description: 'Connect in minutes. Get intelligent code suggestions you can apply with a single click.',
    gradient: 'from-emerald-500 to-teal-400',
  },
]

function FeatureCard({ 
  feature, 
  index 
}: { 
  feature: typeof features[0]
  index: number 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.15,
        ease: [0.21, 0.47, 0.32, 0.98]
      }}
      className="group relative"
    >
      {/* Card */}
      <div className="relative h-full rounded-2xl border border-gray-200 bg-white p-8 transition-all duration-300 hover:border-gray-300 hover:shadow-lg">
        {/* Gradient accent bar */}
        <div className={`absolute top-0 left-8 right-8 h-1 rounded-b-full bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
        
        {/* Decorative gradient blob */}
        <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${feature.gradient} rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
        
        <div className="relative">
          {/* Label */}
          <p className="text-sm font-medium text-primary-600 mb-3">
            {feature.label}
          </p>

          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {feature.title}
          </h3>

          {/* Description */}
          <p className="text-gray-500 leading-relaxed">
            {feature.description}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export function Features() {
  return (
    <section id="features" className="py-24 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header - Two column layout like template */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-sm font-medium text-primary-600 uppercase tracking-wider mb-4 block">
              Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900">
              Built to protect every layer
            </h2>
          </motion.div>
          
          <motion.div
            className="lg:text-right lg:self-end"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <p className="text-lg text-gray-500 max-w-md lg:ml-auto">
              From scanning to fixing, every part of your accessibility workflow stays covered.
            </p>
          </motion.div>
        </div>

        {/* Features Grid - 3 columns */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
