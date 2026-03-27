import { Link } from 'react-router-dom';
import React, { useState, createContext, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

export interface SidebarLinkItem {
  label: string;
  to: string;
  icon: React.JSX.Element | React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within a SidebarProvider');
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);
  const open    = openProp    !== undefined ? openProp    : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;
  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const SidebarRoot = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => (
  <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
    {children}
  </SidebarProvider>
);

// ── Desktop sidebar ──────────────────────────────────────────────────────────
export const DesktopSidebar = ({
  children,
  style,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.div
      animate={{ width: animate ? (open ? '280px' : '64px') : '280px' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        ...style,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// ── Mobile sidebar ───────────────────────────────────────────────────────────
export const MobileSidebar = ({
  children,
  ...props
}: React.ComponentProps<'div'>) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      {/* Mobile top bar — hidden on md+ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '8px 16px',
          backgroundColor: 'var(--sidebar)',
        }}
        {...props}
      >
        <Menu
          style={{ color: 'var(--sidebar-foreground)', cursor: 'pointer' }}
          onClick={() => setOpen(!open)}
        />
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'var(--sidebar)',
                padding: 40,
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: 40,
                  top: 40,
                  cursor: 'pointer',
                  color: 'var(--sidebar-foreground)',
                }}
                onClick={() => setOpen(!open)}
              >
                <X />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

// ── Sidebar link ─────────────────────────────────────────────────────────────
export const SidebarLink = ({
  link,
  isActive = false,
}: {
  link: SidebarLinkItem;
  isActive?: boolean;
}) => {
  const { open, animate } = useSidebar();
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={link.to}
      onClick={link.onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 8px',
        borderRadius: 12,
        textDecoration: 'none',
        backgroundColor: isActive
          ? 'var(--sidebar-accent)'
          : hovered
          ? 'var(--sidebar-accent)'
          : 'transparent',
        transition: 'background-color 0.15s ease',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      {/* Icon */}
      <span
        style={{
          flexShrink: 0,
          color: isActive ? 'var(--sidebar-primary)' : 'var(--sidebar-foreground)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {link.icon}
      </span>

      {/* Label */}
      <motion.span
        animate={{
          opacity:  animate ? (open ? 1 : 0) : 1,
          x:        animate ? (open ? 0 : -6) : 0,
        }}
        transition={{ duration: 0.2 }}
        style={{
          fontSize: '0.875rem',
          fontWeight: isActive ? 700 : 500,
          color: 'var(--sidebar-foreground)',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {link.label}
      </motion.span>
    </Link>
  );
};
