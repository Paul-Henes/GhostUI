// Footer component - Clean and minimal
export function Footer() {
  return (
    <footer className="py-12 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <span className="text-lg font-semibold text-gray-900">Ghost-UI</span>
            <span className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              How it works
            </a>
            <a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Privacy
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
