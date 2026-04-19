// components/EmptyState.js
import React from 'react';

const EmptyState = ({ eyebrow, icon = 'INFO', title, message, action }) => (
  <section className="app-empty-state">
    <div className="app-empty-state__halo" />
    {eyebrow ? <div className="app-empty-state__eyebrow">{eyebrow}</div> : null}
    <div className="app-empty-state__icon">{icon}</div>
    <h3 className="app-empty-state__title">{title}</h3>
    <p className="app-empty-state__message">{message}</p>
    {action ? <div className="app-empty-state__action">{action}</div> : null}
  </section>
);

export default EmptyState;

