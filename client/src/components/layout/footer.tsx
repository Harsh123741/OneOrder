import { Link } from "wouter";
import { Plane } from "lucide-react";

export default function Footer() {
  const footerSections = [
    {
      title: "Services",
      links: [
        { name: "Flight Booking", href: "/" },
        { name: "Travel Insurance", href: "#" },
        { name: "Lounge Access", href: "#" },
        { name: "Priority Services", href: "#" },
      ],
    },
    {
      title: "Support",
      links: [
        { name: "Customer Service", href: "#" },
        { name: "Baggage Info", href: "#" },
        { name: "Flight Status", href: "#" },
        { name: "Contact Us", href: "#" },
      ],
    },
    {
      title: "Company",
      links: [
        { name: "About Us", href: "#" },
        { name: "Careers", href: "#" },
        { name: "Press", href: "#" },
        { name: "Investor Relations", href: "#" },
      ],
    },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <Plane className="h-8 w-8 text-airline-light-blue" />
              <span className="text-xl font-bold">SkyLink Airlines</span>
            </div>
            <p className="text-gray-400 text-sm">
              Connecting you to the world with premium airline services and 
              exceptional customer experience.
            </p>
          </div>

          {/* Footer sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © 2024 SkyLink Airlines. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
