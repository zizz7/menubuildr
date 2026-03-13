import { UtensilsCrossed, Store, Languages, ShieldAlert } from 'lucide-react';

const HIGHLIGHTS = [
  { icon: Store, text: 'Manage menus across all your locations' },
  { icon: Languages, text: 'Multi-language support for global reach' },
  { icon: ShieldAlert, text: 'Built-in allergen management' },
];

export function BrandPanel() {
  return (
    <div className="hidden md:flex md:w-1/2 flex-col justify-center bg-gray-900 p-12 text-white">
      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <UtensilsCrossed className="h-8 w-8" aria-hidden="true" />
          <span className="text-2xl font-bold">MenuBuildr</span>
        </div>

        <h2 className="text-3xl font-bold leading-tight">
          Beautiful digital menus for your restaurants
        </h2>
        <p className="mt-4 text-gray-300 leading-relaxed">
          Create, manage, and publish stunning menus that your customers will love.
        </p>

        <ul className="mt-10 space-y-4" role="list">
          {HIGHLIGHTS.map((item) => (
            <li key={item.text} className="flex items-center gap-3">
              <item.icon className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
              <span className="text-sm text-gray-200">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
