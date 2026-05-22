import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isAdminUser } from '../../utils/userRoles';
import { fetchFeaturedHotRooms, fetchRooms } from '../../services/roomApi';
import HotDealsLoginModal from './HotDealsLoginModal';
import {
  NEW_CRAWLED_HOT_ROOMS_EVENT,
  SHOW_HOT_DEALS_NEW_ROOMS_STORAGE_KEY,
  collectNewCrawledHotRooms,
  mergeNewCrawledHotRooms,
  readActiveCrawlHotRoomsWatch,
  readNewCrawledHotRooms,
} from '../../utils/crawlHotRooms';

export default function FeaturedHotRoomsGate() {
  const navigate = useNavigate();
  const { user, authLoading, pendingHotDealsModal, dismissHotDealsModal } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [newRoomsSignal, setNewRoomsSignal] = useState(0);

  useEffect(() => {
    const handleNewRooms = () => setNewRoomsSignal((value) => value + 1);
    window.addEventListener(NEW_CRAWLED_HOT_ROOMS_EVENT, handleNewRooms);
    return () => window.removeEventListener(NEW_CRAWLED_HOT_ROOMS_EVENT, handleNewRooms);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const showNewRooms = localStorage.getItem(SHOW_HOT_DEALS_NEW_ROOMS_STORAGE_KEY) === 'true';
    const activeWatch = readActiveCrawlHotRoomsWatch();
    const shouldScanReloadedCrawl = Boolean(activeWatch && !showNewRooms);
    const shouldRun = pendingHotDealsModal || showNewRooms || shouldScanReloadedCrawl;

    if (!shouldRun) return;
    if (user && isAdminUser(user)) {
      dismissHotDealsModal();
      localStorage.removeItem(SHOW_HOT_DEALS_NEW_ROOMS_STORAGE_KEY);
      return;
    }

    let active = true;
    setOpen(Boolean(pendingHotDealsModal || showNewRooms));
    setLoading(true);
    setRooms([]);

    let newCrawled = readNewCrawledHotRooms();
    const latestRoomsPromise = shouldScanReloadedCrawl
      ? fetchRooms({
          status: 'available',
          sort_by: 'created_at',
          sort_order: 'desc',
          limit: 80,
        }).then(({ rooms: latestRooms }) => latestRooms)
      : Promise.resolve([]);

    Promise.all([fetchFeaturedHotRooms(10), latestRoomsPromise.catch(() => [])])
      .then(([list, latestRooms]) => {
        if (!active) return;

        if (activeWatch && latestRooms.length > 0) {
          const detected = collectNewCrawledHotRooms(latestRooms, activeWatch);
          if (detected.length > 0) {
            newCrawled = mergeNewCrawledHotRooms(newCrawled, detected, activeWatch);
          }
        }

        if (shouldScanReloadedCrawl && !pendingHotDealsModal && newCrawled.length === 0) {
          setOpen(false);
          return;
        }

        const displayRooms = newCrawled.length > 0 ? newCrawled : list;

        if (!displayRooms.length) {
          setOpen(false);
          dismissHotDealsModal();
          localStorage.setItem(SHOW_HOT_DEALS_NEW_ROOMS_STORAGE_KEY, 'false');
          return;
        }

        setOpen(true);
        setRooms(displayRooms);
      })
      .catch(() => {
        if (active) {
          if (newCrawled.length > 0) {
            setOpen(true);
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
          localStorage.setItem(SHOW_HOT_DEALS_NEW_ROOMS_STORAGE_KEY, 'false');
        }
      });

    return () => { active = false; };
  }, [authLoading, pendingHotDealsModal, newRoomsSignal, user, dismissHotDealsModal]);

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
