'use strict';

// Coalesce calls into one browser frame, always using the latest arguments.
module.exports = function rafSchd(callback) {
  let pending = null;
  let args = null;
  function schedule(...latest) {
    args = latest;
    if (pending !== null) return;
    const ticket = {id: 0};
    pending = ticket;
    try {
      ticket.id = requestAnimationFrame(() => {
        if (pending !== ticket) return;
        const values = args;
        pending = args = null;
        callback(...values);
      });
    } catch (error) {
      if (pending === ticket) pending = args = null;
      throw error;
    }
  }
  schedule.cancel = function() {
    const ticket = pending;
    pending = args = null;
    if (ticket !== null) cancelAnimationFrame(ticket.id);
  };
  return schedule;
};
