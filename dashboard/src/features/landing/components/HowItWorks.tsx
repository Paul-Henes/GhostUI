// How it works section - Clean numbered steps
import { motion } from 'framer-motion'

const steps = [
  {
    number: '01',
    title: 'Scan your website',
    description: 'Enter your URL and our AI-powered scanner analyzes every page for WCAG 2.1 compliance issues.',
  },
  {
    number: '02',
    title: 'Review the issues',
    description: 'Get a detailed report with severity levels, affected elements, and WCAG criteria for each issue found.',
  },
  {
    number: '03',
    title: 'Fix with AI assistance',
    description: 'Our AI generates code fixes you can apply directly. One click to make your site accessible.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-sm font-medium text-primary-600 uppercase tracking-wider mb-4 block">
              How it works
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900">
              Three steps to accessibility
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
              Get your website WCAG compliant in minutes, not months.
            </p>
          </motion.div>
        </div>

        {/* Steps - Horizontal layout */}
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-gray-200 to-transparent -translate-x-4" />
              )}
              
              {/* Step number */}
              <div className="flex items-center gap-4 mb-6">
                <span className="text-6xl font-light text-gray-200">
                  {step.number}
                </span>
              </div>
              
              {/* Content */}
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {step.title}
              </h3>
              
              <p className="text-gray-500 leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
