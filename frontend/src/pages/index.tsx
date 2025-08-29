import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import Head from 'next/head'
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ShieldCheckIcon,
  ClockIcon,
  StarIcon,
} from '@heroicons/react/24/outline'

const HomePage: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: 'Home', href: '#home', icon: HomeIcon },
    { name: 'Services', href: '#services', icon: ShieldCheckIcon },
    { name: 'About', href: '#about', icon: DocumentTextIcon },
    { name: 'Contact', href: '#contact', icon: PhoneIcon },
    { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon, requireAuth: true },
  ]

  const services = [
    {
      title: 'Residential Pest Control',
      description: 'Complete pest control solutions for homes and apartments',
      icon: HomeIcon,
    },
    {
      title: 'Commercial Services',
      description: 'Professional pest management for businesses and offices',
      icon: UserGroupIcon,
    },
    {
      title: 'Termite Control',
      description: 'Specialized termite inspection and treatment services',
      icon: ShieldCheckIcon,
    },
    {
      title: '24/7 Emergency',
      description: 'Round-the-clock emergency pest control services',
      icon: ClockIcon,
    },
  ]

  const features = [
    {
      title: 'Expert Team',
      description: 'Certified and experienced pest control professionals',
      icon: UserGroupIcon,
    },
    {
      title: 'Safe Methods',
      description: 'Eco-friendly and safe pest control solutions',
      icon: ShieldCheckIcon,
    },
    {
      title: 'Quick Response',
      description: 'Fast response times for all service requests',
      icon: ClockIcon,
    },
    {
      title: '100% Satisfaction',
      description: 'Guaranteed satisfaction with our services',
      icon: StarIcon,
    },
  ]

  const handleNavClick = (href: string, requireAuth?: boolean) => {
    if (requireAuth && !user) {
      router.push('/auth')
      return
    }
    
    if (href.startsWith('#')) {
      const element = document.getElementById(href.substring(1))
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      router.push(href)
    }
    setSidebarOpen(false)
  }

  return (
    <>
      <Head>
        <title>Pest Control Management System</title>
        <meta name="description" content="Professional pest control management system" />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}>
          <div className="flex items-center justify-between h-16 px-4 bg-gray-800">
            <h1 className="text-white font-bold text-lg">PestControl</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="mt-8">
            <div className="px-4 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon
                const showItem = !item.requireAuth || user
                
                if (!showItem) return null
                
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item.href, item.requireAuth)}
                    className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </button>
                )
              })}
            </div>
            
            {/* Auth Buttons */}
            <div className="mt-8 px-4 space-y-2">
              {user ? (
                <div className="text-gray-400 text-sm px-4 py-2">
                  Welcome, {user.name}!
                </div>
              ) : (
                <>
                  <Button
                    onClick={() => router.push('/auth')}
                    variant="primary"
                    fullWidth
                    className="mb-2"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => router.push('/auth')}
                    variant="outline"
                    fullWidth
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:ml-64">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="flex items-center justify-between h-16 px-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-600 hover:text-gray-900"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              <div className="lg:hidden">
                <h1 className="text-xl font-bold text-gray-900">PestControl</h1>
              </div>
              <div className="hidden lg:block" />
            </div>
          </header>

          {/* Hero Section */}
          <section id="home" className="bg-gradient-to-br from-primary-50 to-primary-100 py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                  Professional Pest Control
                  <span className="block text-primary-600">Management System</span>
                </h1>
                <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                  Comprehensive pest control solutions with advanced management tools.
                  Protect your property with our expert services and cutting-edge technology.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => handleNavClick('#contact')}
                    variant="primary"
                    size="lg"
                  >
                    Get Free Quote
                  </Button>
                  <Button
                    onClick={() => handleNavClick('#services')}
                    variant="outline"
                    size="lg"
                  >
                    Our Services
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Services Section */}
          <section id="services" className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Our Services
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  We provide comprehensive pest control solutions for residential and commercial properties
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {services.map((service, index) => {
                  const Icon = service.icon
                  return (
                    <div key={index} className="text-center p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg mb-4">
                        <Icon className="h-6 w-6 text-primary-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {service.title}
                      </h3>
                      <p className="text-gray-600">
                        {service.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="about" className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Why Choose Us
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  We are committed to providing the best pest control services with modern management tools
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <div key={index} className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600">
                        {feature.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section id="contact" className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Contact Us
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Get in touch with our expert team for professional pest control services
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg mb-4">
                    <PhoneIcon className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone</h3>
                  <p className="text-gray-600">+91 98765 43210</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg mb-4">
                    <EnvelopeIcon className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Email</h3>
                  <p className="text-gray-600">info@pestcontrol.com</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg mb-4">
                    <MapPinIcon className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Address</h3>
                  <p className="text-gray-600">123 Business Street, City, State 12345</p>
                </div>
              </div>
              <div className="text-center mt-12">
                <Button
                  onClick={() => router.push('/auth')}
                  variant="primary"
                  size="lg"
                >
                  Get Started Today
                </Button>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="bg-gray-900 text-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-4">Pest Control Management</h3>
                <p className="text-gray-400 mb-8">
                  Professional pest control services with advanced management solutions
                </p>
                <div className="border-t border-gray-800 pt-8">
                  <p className="text-gray-400">
                    © 2024 Pest Control Management System. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          </footer>
        </div>

        {/* Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </>
  )
}

export default HomePage