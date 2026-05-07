// Get Started section - Auth integrated naturally
import { motion } from 'framer-motion'
import { AuthCard } from './AuthCard'

export function GetStarted() {
  return (
    <section id="get-started" className="py-24 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-sm font-medium text-primary-600 uppercase tracking-wider mb-4 block">
              Get Started
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-6">
              Start making your website accessible today
            </h2>
            <p className="text-lg text-gray-500 mb-8">
              Create your free account and run your first accessibility scan in under 2 minutes. No credit card required.
            </p>
            
            <ul className="space-y-4">
              {[
                'Unlimited scans on the free plan',
                'AI-powered fix suggestions',
                'WCAG 2.1 & EAA compliance reports',
                'Export issues to your issue tracker',
              ].map((item, index) => (
                <motion.li
                  key={item}
                  className="flex items-center gap-3 text-gray-600"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                >
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Right - Auth Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <AuthCard />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
