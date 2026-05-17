import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isAdminUser } from '../../utils/userRoles';
import { fetchNearbyCrawlNewRooms } from '../../services/roomApi';
import NearbyCrawlRoomsModal from './NearbyCrawlRoomsModal';

export default function NearbyCrawlRoomsGate() {
  const { user, authLoading, pendingNearbyCrawlModal, dismissNearbyCrawlModal } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    if (authLoading || !pendingNearbyCrawlModal || !user) return;
    if (isAdminUser(user)) {
      dismissNearbyCrawlModal();
      return;
    }
    const address = String(user.address || '').trim();
    if (!address) {
      dismissNearbyCrawlModal();
      return;
    }

    let active = true;
    setOpen(true);
    setLoading(true);
    setRooms([]);

    fetchNearbyCrawlNewRooms(30)
      .then((list) => {
        if (!active) return;
        if (!list.length) {
          setOpen(false);
          dismissNearbyCrawlModal();
          return;
        }
        setRooms(list);
      })
      .catch(() => {
        if (active) setOpen(false);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          dismissNearbyCrawlModal();
        }
      });

    return () => { active = false; };
  }, [authLoading, pendingNearbyCrawlModal, user, dismissNearbyCrawlModal]);

  const handleClose = () => {
    setOpen(false);
    dismissNearbyCrawlModal();
  };

  return (
    <NearbyCrawlRoomsModal
      open={open}
      rooms={rooms}
      userAddress={user?.address}
      loading={loading}
      onClose={handleClose}
    />
  );
}
