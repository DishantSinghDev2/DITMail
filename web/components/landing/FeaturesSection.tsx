import {
  EnvelopeIcon,
  ShieldCheckIcon,
  CloudIcon,
  DevicePhoneMobileIcon,
  UsersIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline"

const features = [
  {
    name: "Custom Domain Email",
    description: "Professional email addresses with your own domain name. Build trust and credibility with customers.",
    icon: EnvelopeIcon,
  },
  {
    name: "Enterprise Security",
    description: "Advanced encryption, spam protection, and security features to keep your communications safe.",
    icon: ShieldCheckIcon,
  },
  {
    name: "Cloud Storage",
    description: "Generous storage space with automatic backups and file sharing capabilities.",
    icon: CloudIcon,
  },
  {
    name: "Mobile Access",
    description: "Access your email anywhere with our mobile apps and responsive web interface.",
    icon: DevicePhoneMobileIcon,
  },
  {
    name: "Team Collaboration",
    description: "Shared calendars, contacts, and collaboration tools for seamless teamwork.",
    icon: UsersIcon,
  },
  {
    name: "Analytics & Reports",
    description: "Detailed insights into email usage, security events, and team productivity.",
    icon: ChartBarIcon,
  },
]

export function FeaturesSection() {
  return (
    <div id="features" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600">Everything you need</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Professional email hosting made simple
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Get all the features you need to run your business email professionally, with enterprise-grade security and
            reliability.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
            {features.map((feature) => (
              <div key={feature.name} className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
