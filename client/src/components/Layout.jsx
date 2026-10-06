import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Package, TrendingUp, ShieldAlert, Map, Truck, 
  CloudLightning, GitBranch, Lightbulb, Activity, Database, Bell, 
  FileText, List, Settings, LogOut, ChevronLeft, ChevronRight,
  ShieldCheck, Route, Edit3, KeyRound, User
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import ErrorBoundary from './ErrorBoundary';
import EditProfileModal from './EditProfileModal';
import LanguageToggle from './LanguageToggle';

const Layout = () => {
  const { user, logout, alertCount, connectivity, lastSync, language, t } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleName = user?.role || 'Logistics Officer';

  // Strict role-specific navigation with simple, friendly everyday words
  const getNavGroups = () => {
    // 1. Logistics Officer (The Decision Maker: reviews supply risks & approves resupply plans)
    if (roleName === 'Logistics Officer') {
      return [
        {
          title: 'MAIN',
          items: [
            { name: 'Overview', path: '/', icon: LayoutDashboard }
          ]
        },
        {
          title: 'SUPPLIES & ROADS',
          items: [
            { name: 'Current Supplies', path: '/inventory', icon: Package },
            { name: 'Future Needs', path: '/demand-forecast', icon: TrendingUp },
            { name: 'Shortage Risks', path: '/supply-risk', icon: ShieldAlert },
            { name: 'Routes & Weather', path: '/weather-route', icon: Route }
          ]
        },
        {
          title: 'DECISIONS & TESTING',
          items: [
            { name: 'Suggested Actions', path: '/recommendations', icon: Lightbulb },
            { name: 'Test Scenarios', path: '/what-if', icon: GitBranch }
          ]
        },
        {
          title: 'MONITORING',
          items: [
            { name: 'Urgent Alerts', path: '/alerts', icon: Bell, badge: alertCount },
            { name: 'Reports', path: '/reports', icon: FileText }
          ]
        }
      ];
    }

    // 2. Supply / Inventory Officer (Focus: "What do we have?" - Stock, daily consumption, shortages)
    if (roleName === 'Supply / Inventory Officer') {
      return [
        {
          title: 'MAIN',
          items: [
            { name: 'Supplies Overview', path: '/', icon: LayoutDashboard }
          ]
        },
        {
          title: 'STOCK & USAGE',
          items: [
            { name: 'Stock & Supplies', path: '/inventory', icon: Package },
            { name: 'Supply & Demand', path: '/demand-forecast', icon: TrendingUp },
            { name: 'Sensor Readings', path: '/iot-simulation', icon: Activity }
          ]
        },
        {
          title: 'MONITORING',
          items: [
            { name: 'Stock Alerts', path: '/alerts', icon: Bell, badge: alertCount },
            { name: 'Stock Reports', path: '/reports', icon: FileText }
          ]
        }
      ];
    }

    // 3. Transport Coordinator (Focus: "How do we move it?" - Trucks, trips, routes, weather)
    if (roleName === 'Transport Coordinator') {
      return [
        {
          title: 'MAIN',
          items: [
            { name: 'Transport Overview', path: '/', icon: LayoutDashboard }
          ]
        },
        {
          title: 'FLEET VEHICLES',
          items: [
            { name: 'Trucks & Fleet', path: '/transport', icon: Truck }
          ]
        },
        {
          title: 'MONITORING',
          items: [
            { name: 'Delivery Alerts', path: '/alerts', icon: Bell, badge: alertCount },
            { name: 'Transport Reports', path: '/reports', icon: FileText }
          ]
        }
      ];
    }

    // 4. Administrator (Focus: "Is the system running properly?" - Data, activity logs, settings)
    if (roleName === 'Administrator') {
      return [
        {
          title: 'MAIN',
          items: [
            { name: 'System Overview', path: '/', icon: LayoutDashboard }
          ]
        },
        {
          title: 'SYSTEM CONTROLS',
          items: [
            { name: 'Manage Data', path: '/data-management', icon: Database },
            { name: 'Activity History', path: '/audit-log', icon: List },
            { name: 'Settings', path: '/settings', icon: Settings }
          ]
        },
        {
          title: 'MONITORING',
          items: [
            { name: 'System Alerts', path: '/alerts', icon: Bell, badge: alertCount },
            { name: 'System Reports', path: '/reports', icon: FileText }
          ]
        }
      ];
    }

    // Default Fallback
    return [
      {
        title: 'MAIN',
        items: [
          { name: 'Overview', path: '/', icon: LayoutDashboard },
          { name: 'Current Supplies', path: '/inventory', icon: Package }
        ]
      }
    ];
  };

  const navGroups = getNavGroups();

  const getPortalInfo = (role) => {
    switch (role) {
      case 'Logistics Officer':
        return { 
          badge: 'Logistics Officer', 
          desc: 'Decision Maker: Reviews risks and approves resupply plans', 
          motto: '“What should we do?”',
          theme: 'bg-teal-50 text-teal-800 border-teal-300' 
        };
      case 'Supply / Inventory Officer':
        return { 
          badge: 'Supply Officer', 
          desc: 'Stock Keeper: Tracks food, water, and fuel quantities and daily usage', 
          motto: '“What do we have?”',
          theme: 'bg-emerald-50 text-emerald-800 border-emerald-300' 
        };
      case 'Transport Coordinator':
        return { 
          badge: 'Transport Coordinator', 
          desc: 'Trucks & Drivers: Manages trucks, deliveries, and road weather', 
          motto: '“How do we move it?”',
          theme: 'bg-sky-50 text-sky-800 border-sky-300' 
        };
      case 'Administrator':
        return { 
          badge: 'Administrator', 
          desc: 'System Manager: Oversees system health, data, and user activity', 
          motto: '“Is the system running properly?”',
          theme: 'bg-slate-100 text-slate-800 border-slate-300' 
        };
      default:
        return { 
          badge: 'Logistics Officer', 
          desc: 'Decision Support Portal', 
          motto: '“What should we do?”',
          theme: 'bg-teal-50 text-teal-800 border-teal-200' 
        };
    }
  };

  const portal = getPortalInfo(roleName);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Online': return 'bg-emerald-500 ring-2 ring-emerald-200';
      case 'Limited': return 'bg-amber-500 ring-2 ring-amber-200';
      case 'Offline': return 'bg-rose-500 ring-2 ring-rose-200';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 antialiased">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-white border-r border-slate-200 shadow-sm transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 bg-white">
          {!collapsed ? (
            <div className="flex items-center space-x-2.5">
              <img 
                src="/flink-emblem.png" 
                alt="F-LINK Emblem" 
                className="w-8 h-8 object-contain drop-shadow-xs select-none" 
              />
              <div>
                <span className="font-extrabold text-lg tracking-wider text-teal-800">F-LINK</span>
                <span className="block text-[10px] text-teal-600 font-semibold tracking-tight uppercase leading-none">{t('Resupply Assistant')}</span>
              </div>
            </div>
          ) : (
            <img 
              src="/flink-emblem.png" 
              alt="F-LINK Emblem" 
              className="w-8 h-8 mx-auto object-contain drop-shadow-xs select-none" 
            />
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)} 
            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Role Identity Box in Sidebar */}
        {!collapsed && (
          <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-200/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('Current Role')}</div>
            <div className="text-xs font-extrabold text-teal-950 truncate mt-0.5">{t(roleName)}</div>
            <div className="text-[11px] text-slate-500 font-medium truncate">{t(portal.desc)}</div>
            <div className="text-[10px] text-teal-700 font-mono mt-1 font-semibold">{t(portal.motto)}</div>
            <button
              onClick={() => setEditProfileOpen(true)}
              className="mt-2 w-full flex items-center justify-center space-x-1.5 py-1 px-2 rounded-md bg-teal-50 hover:bg-teal-100 border border-teal-200/80 text-[11px] font-semibold text-teal-800 transition-colors cursor-pointer"
              title={t('Edit Name & Password')}
            >
              <Edit3 size={12} className="text-teal-700" />
              <span>{t('Edit Name & Password')}</span>
            </button>
          </div>
        )}
        
        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              {!collapsed && (
                <div className="px-3 mb-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  {t(group.title)}
                </div>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm transition-all font-medium ${
                          isActive 
                            ? 'bg-teal-50 text-teal-800 font-semibold shadow-xs border border-teal-200/60' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-teal-800'
                        }`}
                        title={collapsed ? t(item.name) : ''}
                      >
                        <item.icon size={18} className={`${collapsed ? 'mx-auto' : 'mr-3'} ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                        {!collapsed && <span className="flex-1 truncate">{t(item.name)}</span>}
                        {!collapsed && item.badge > 0 && (
                          <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        {!collapsed && (
          <div className="p-3 border-t border-slate-200 bg-slate-50/70 text-xs text-slate-500 flex items-center justify-between">
            <span className="font-medium text-slate-600">F-LINK v2.5</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded font-semibold">{t('Active')}</span>
          </div>
        )}
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 shadow-xs z-10">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <img 
                src="/flink-emblem.png" 
                alt="F-LINK Emblem" 
                className="w-7 h-7 object-contain drop-shadow-xs select-none" 
              />
              <span className="px-2.5 py-1 bg-teal-700 text-white text-xs font-extrabold rounded uppercase tracking-wider shadow-2xs">
                F-LINK
              </span>
            </div>
            <span className={`px-2.5 py-1 rounded text-xs font-bold border ${portal.theme}`}>
              {t(portal.badge)}
            </span>
            <span className="text-xs font-medium text-slate-500 hidden lg:inline">
              {t('• Final decisions require human officer sign-off')}
            </span>
          </div>
          
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Language Toggle (English <-> Hindi) */}
            <LanguageToggle />

            {/* Live Time */}
            <div className="text-xs font-medium text-slate-500 hidden xl:block bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 font-mono">
              {currentTime.toLocaleTimeString()}
            </div>
            
            {/* Connectivity Status */}
            <div className="flex items-center space-x-2 text-xs bg-slate-50 px-2.5 sm:px-3 py-1.5 rounded-md border border-slate-200">
              <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(connectivity)}`}></span>
              <span className="font-semibold text-slate-700">{t(connectivity)}</span>
            </div>
            
            {/* Alert Bell */}
            <div 
              onClick={() => navigate('/alerts')} 
              className="relative p-2 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
              title={t('View Alerts')}
            >
              <Bell size={19} />
              {alertCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
                  {alertCount}
                </span>
              )}
            </div>
            
            {/* User Profile */}
            <div className="flex items-center space-x-2 sm:space-x-2.5 border-l border-slate-200 pl-3 sm:pl-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-900 leading-tight">{user?.full_name || user?.username || 'User'}</div>
                <div className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider">{t(user?.role)}</div>
              </div>
              <button
                onClick={() => setEditProfileOpen(true)}
                className="p-2 text-slate-500 hover:text-teal-800 hover:bg-teal-50 rounded-md transition-colors cursor-pointer border border-slate-200 hover:border-teal-300 flex items-center gap-1 text-xs font-medium"
                title={t('Edit Profile')}
              >
                <Edit3 size={15} />
                <span className="hidden md:inline">{t('Edit Profile')}</span>
              </button>
              <button 
                onClick={handleLogout} 
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                title={t('Log Out')}
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-auto bg-slate-50 p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Edit Profile Modal */}
      <EditProfileModal isOpen={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
    </div>
  );
};

export default Layout;
