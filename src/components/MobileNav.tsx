'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Icon, { IconName } from './ui/Icon';

interface NavItem {
  name: string;
  href: string;
  icon: IconName;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: 'home' },
  { name: 'Locations', href: '/admin/locations', icon: 'location' },
  { name: 'Tasks', href: '/admin/tasks', icon: 'clipboard' },
  { name: 'Settings', href: '/admin/settings', icon: 'settings' }
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item, index) => {
          const isActive = pathname.startsWith(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center flex-1 h-full"
            >
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="relative"
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -inset-3 bg-blue-50 rounded-xl"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                
                {/* Icon */}
                <motion.div
                  className="relative z-10"
                  whileTap={{ scale: 0.9 }}
                >
                  <Icon
                    name={item.icon}
                    className={`transition-colors ${
                      isActive ? 'text-blue-600' : 'text-gray-500'
                    }`}
                    size="md"
                  />
                </motion.div>
              </motion.div>
              
              {/* Label */}
              <motion.span
                initial={false}
                animate={{
                  opacity: isActive ? 1 : 0.7,
                  y: isActive ? 0 : 2
                }}
                className={`text-xs mt-1 font-medium ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                {item.name}
              </motion.span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}



