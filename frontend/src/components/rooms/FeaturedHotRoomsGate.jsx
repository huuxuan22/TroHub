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
    if (authLoading) return;

    // Check if we should trigger due to new crawled rooms on reload
    const showNewRooms = localStorage.getItem('trohub_show_hot_deals_new_rooms') === 'true';
    const shouldOpen = pendingHotDealsModal || showNewRooms;

    if (!shouldOpen) return;
    if (user && isAdminUser(user)) {
      dismissHotDealsModal();
      localStorage.removeItem('trohub_show_hot_deals_new_rooms');
      return;
    }

    let active = true;
    setOpen(true);
    setLoading(true);
    setRooms([]);

    // Load new crawled rooms from localStorage
    let newCrawled = [];
    try {
      const stored = localStorage.getItem('trohub_new_crawled_rooms');
      if (stored) {
        newCrawled = JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }

    fetchFeaturedHotRooms(10)
      .then((list) => {
        if (!active) return;

        // Merge list: prepend new crawled rooms and remove duplicates
        const newIds = new Set(newCrawled.map((r) => r.id));
        const filteredList = list.filter((r) => !newIds.has(r.id));
        const merged = [...newCrawled, ...filteredList];

        if (!merged.length) {
          setOpen(false);
          dismissHotDealsModal();
          localStorage.setItem('trohub_show_hot_deals_new_rooms', 'false');
          return;
        }

        setRooms(merged);
      })
      .catch(() => {
        if (active) {
          // If fetch fails but we have new crawled rooms, we can still display them!
          if (newCrawled.length > 0) {
            setRooms(newCrawled);
          } else {
            setOpen(false);
          }
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          dismissHotDealsModal();
          localStorage.setItem('trohub_show_hot_deals_new_rooms', 'false');
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
