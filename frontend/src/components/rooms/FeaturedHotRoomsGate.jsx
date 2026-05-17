import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isAdminUser } from '../../utils/userRoles';
import { fetchFeaturedHotRooms } from '../../services/roomApi';
import HotDealsLoginModal from './HotDealsLoginModal';

export default function FeaturedHotRoomsGate() {
  const navigate = useNavigate();
  const { user, authLoading, pendingHotDealsModal, dismissHotDealsModal } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    if (authLoading || !pendingHotDealsModal || !user) return;
    if (isAdminUser(user)) {
      dismissHotDealsModal();
      return;
    }

    let active = true;
    setOpen(true);
    setLoading(true);
    setRooms([]);

    fetchFeaturedHotRooms(10)
      .then((list) => {
        if (!active) return;
        if (!list.length) {
          setOpen(false);
          dismissHotDealsModal();
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
          dismissHotDealsModal();
        }
      });

    return () => { active = false; };
  }, [authLoading, pendingHotDealsModal, user, dismissHotDealsModal]);

  const handleClose = () => {
    setOpen(false);
    dismissHotDealsModal();
  };

  const handleRoomClick = (roomId) => {
    if (!roomId) return;
    handleClose();
    navigate(`/room/${roomId}`);
  };

  const firstName = user?.full_name?.trim().split(/\s+/).pop();

  return (
    <HotDealsLoginModal
      open={open}
      rooms={rooms}
      loading={loading}
      userName={firstName}
      onClose={handleClose}
      onRoomClick={handleRoomClick}
    />
  );
}
