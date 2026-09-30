import { NavLink } from "react-router-dom";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "../services/navigation";
import { NavIcon } from "./icons";

function NavEntry({ item }: { item: NavItem }) {
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.end ?? false}
        className={({ isActive }) => `app-nav__link${isActive ? " app-nav__link--active" : ""}`}
      >
        <NavIcon name={item.icon} />
        <span>{item.label}</span>
      </NavLink>
    </li>
  );
}

export function Sidebar() {
  return (
    <aside className="app-sidebar">
      <div className="app-brand">
        <span className="app-brand__mark" aria-hidden="true">
          MDX
        </span>
        <span className="app-brand__name">MDX Studio</span>
      </div>
      <nav aria-label="Primary" className="app-nav">
        <ul className="app-nav__list">
          {PRIMARY_NAV.map((item) => (
            <NavEntry key={item.to} item={item} />
          ))}
        </ul>
      </nav>
      <nav aria-label="Secondary" className="app-nav app-nav--bottom">
        <ul className="app-nav__list">
          {SECONDARY_NAV.map((item) => (
            <NavEntry key={item.to} item={item} />
          ))}
        </ul>
      </nav>
    </aside>
  );
}
