import { FC } from 'react';

// Import all outline icons you'll use
import {
  HomeIcon,
  MapPinIcon,
  Cog6ToothIcon,
  UserIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  BellIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  TrashIcon,
  PencilIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ClockIcon,
  PhotoIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  Bars3Icon,
  EllipsisVerticalIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

// Map of icon names to components
const iconMap = {
  home: HomeIcon,
  location: MapPinIcon,
  settings: Cog6ToothIcon,
  user: UserIcon,
  plus: PlusIcon,
  close: XMarkIcon,
  check: CheckIcon,
  'chevron-right': ChevronRightIcon,
  'chevron-left': ChevronLeftIcon,
  'chevron-down': ChevronDownIcon,
  'chevron-up': ChevronUpIcon,
  search: MagnifyingGlassIcon,
  bell: BellIcon,
  'arrow-right': ArrowRightIcon,
  'arrow-left': ArrowLeftIcon,
  trash: TrashIcon,
  edit: PencilIcon,
  document: DocumentTextIcon,
  clipboard: ClipboardDocumentListIcon,
  building: BuildingOfficeIcon,
  calendar: CalendarIcon,
  clock: ClockIcon,
  photo: PhotoIcon,
  video: VideoCameraIcon,
  chat: ChatBubbleLeftRightIcon,
  envelope: EnvelopeIcon,
  phone: PhoneIcon,
  menu: Bars3Icon,
  'more-vertical': EllipsisVerticalIcon,
  filter: FunnelIcon,
  adjustments: AdjustmentsHorizontalIcon
};

export type IconName = keyof typeof iconMap;

interface IconProps {
  name: IconName;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export default function Icon({ name, className = '', size = 'md' }: IconProps) {
  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in iconMap`);
    return null;
  }
  
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10'
  };

  return <IconComponent className={`${sizeClasses[size]} ${className}`} />;
}



