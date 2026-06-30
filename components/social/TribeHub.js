// components/social/TribeHub.js
// Standalone Tribe / Brotherhood tab — leaderboard, shared bookclub and
// per-book discussion. Extracted from SocialHub so it gets a full tab width
// instead of being squeezed inside the chat hub. Gold accent (Social family).
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { useTabData } from '@/hooks/useTabData';
import styles from './SocialHub.module.css';

const DAY = 86400000;
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

// Set of 'YYYY-MM-DD' activity dates from a user doc's real tab data
// (focus sessions, gym sessions, behavior check-ins, biometric logs).
function activityDates(userDoc) {
  const tabs = userDoc?.tabs || {};
  const dates = new Set();
  (tabs.managerFocus?.sessions || []).forEach((s) => { if (s?.ts) dates.add(s.ts.slice(0, 10)); });
  (tabs.gymSessions?.sessions || []).forEach((s) => { if (s?.finishedAt) dates.add(dayKey(s.finishedAt)); });
  (tabs.behaviorLab?.behaviors || []).forEach((b) => { Object.keys(b?.checkins || {}).forEach((k) => dates.add(k)); });
  Object.keys(tabs.biometricsLog?.history || {}).forEach((k) => dates.add(k));
  return dates;
}

// Deterministic weekly score derived from real activity in the last 7 days
// (no random — replaces the old Math.random() leaderboard fallback).
export function computeTribeScore(userDoc, now = Date.now()) {
  const tabs = userDoc?.tabs || {};
  const profile = userDoc?.profile || {};
  const since = now - 7 * DAY;
  const focusMin = (tabs.managerFocus?.sessions || [])
    .filter((s) => s?.ts && new Date(s.ts).getTime() >= since)
    .reduce((sum, s) => sum + (Number(s.durationMin) || 0), 0);
  const gymCount = (tabs.gymSessions?.sessions || [])
    .filter((s) => Number(s?.finishedAt) >= since).length;
  let behaviorChecks = 0;
  (tabs.behaviorLab?.behaviors || []).forEach((b) => {
    Object.keys(b?.checkins || {}).forEach((k) => { if (new Date(k).getTime() >= since) behaviorChecks++; });
  });
  const goalsDone = (profile.weeklyGoals || []).filter((g) => g?.completed).length;
  const level = Number(profile.level) || 1;
  return level * 50 + Math.round(focusMin) + gymCount * 40 + behaviorChecks * 15 + goalsDone * 25;
}

// Consecutive-day activity streak ending today or yesterday.
export function computeStreakDays(userDoc) {
  const dates = activityDates(userDoc);
  if (dates.size === 0) return 0;
  let count = 0;
  const d = new Date();
  if (!dates.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (count < 365) {
    if (dates.has(dayKey(d))) { count++; d.setDate(d.getDate() - 1); } else break;
  }
  return count;
}

// Consecutive-day streak for a single challenge's { 'YYYY-MM-DD': true } log.
function challengeStreak(checkins) {
  const done = checkins || {};
  let count = 0;
  const d = new Date();
  if (!done[dayKey(d)]) d.setDate(d.getDate() - 1);
  while (count < 365) {
    if (done[dayKey(d)]) { count++; d.setDate(d.getDate() - 1); } else break;
  }
  return count;
}

const CHALLENGES = [
  { id: 'fasting', name: '7-Tage-Fasten', targetDays: 7, blurb: 'Tägliches 16:8-Fenster halten.' },
  { id: '5am', name: '5 AM Club', targetDays: 30, blurb: 'Aufstehen vor 5 Uhr.' },
  { id: 'coldshower', name: 'Kaltdusche', targetDays: 14, blurb: 'Täglich kalt abduschen.' },
];

export default function TribeHub() {
  const { user } = useAuth();

  const [leaderboardUsers, setLeaderboardUsers] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [sharedBooks, setSharedBooks] = useState([
    {
      id: 'meditations',
      title: 'Meditations',
      author: 'Marcus Aurelius',
      description: 'Selbstbetrachtungen zur Stärkung der stoischen Disziplin und Resilienz.',
      recommendedByName: 'Marcus',
      activeReaderCount: 8,
      averageRating: 5.0,
      tags: ['philosophy', 'stoicism', 'wisdom']
    },
    {
      id: 'atomic_habits',
      title: 'Atomic Habits',
      author: 'James Clear',
      description: 'Ein praktischer Leitfaden zum Aufbau guter Gewohnheiten und zum Brechen schlechter.',
      recommendedByName: 'Viktor',
      activeReaderCount: 12,
      averageRating: 4.8,
      tags: ['habits', 'psychology', 'discipline']
    }
  ]);
  const [loadingSharedBooks, setLoadingSharedBooks] = useState(true);
  const [selectedBook, setSelectedBook] = useState(null);
  const [bookComments, setBookComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [sharingBookForm, setSharingBookForm] = useState({ title: '', author: '', description: '', tags: '' });
  const [sharingBook, setSharingBook] = useState(false);
  const [showAddSharedBook, setShowAddSharedBook] = useState(false);
  const [challengeMembers, setChallengeMembers] = useState({});

  // Per-user challenge state (Firestore tabs when signed-in, localStorage when not).
  const { data: challengeData, save: saveChallenges } = useTabData('tribeChallenges', { joined: {}, checkins: {} });
  const joinedChallenges = challengeData?.joined || {};
  const challengeCheckins = challengeData?.checkins || {};

  const toggleJoinChallenge = (id) => {
    saveChallenges((prev) => {
      const j = { ...(prev.joined || {}) };
      if (j[id]) delete j[id];
      else j[id] = { startedAt: new Date().toISOString() };
      return { ...prev, joined: j };
    });
  };
  const checkinChallenge = (id) => {
    const k = dayKey(Date.now());
    saveChallenges((prev) => {
      const cks = { ...(prev.checkins || {}) };
      const forId = { ...(cks[id] || {}) };
      if (forId[k]) delete forId[k];
      else forId[k] = true;
      cks[id] = forId;
      return { ...prev, checkins: cks };
    });
  };

  // Load Leaderboard
  useEffect(() => {
    if (!db) return;
    setLoadingLeaderboard(true);
    const usersRef = collection(db, 'users');
    getDocs(query(usersRef)).then((snap) => {
      const list = [];
      const memberTally = {};
      snap.forEach((docu) => {
        const data = docu.data();
        list.push({
          uid: docu.id,
          username: data.profile?.username || 'Anonym',
          level: data.profile?.level || 1,
          weeklyScore: computeTribeScore(data),
          streakDays: computeStreakDays(data),
          avatar: data.profile?.avatarUrl || ''
        });
        const joined = data.tabs?.tribeChallenges?.joined || {};
        Object.keys(joined).forEach((cid) => { memberTally[cid] = (memberTally[cid] || 0) + 1; });
      });
      list.sort((a, b) => b.weeklyScore - a.weeklyScore);
      setLeaderboardUsers(list);
      setChallengeMembers(memberTally);
      setLoadingLeaderboard(false);
    }).catch((err) => {
      console.error("Failed to load leaderboard:", err);
      setLoadingLeaderboard(false);
    });
  }, []);

  // Load Shared Books
  useEffect(() => {
    if (!db) return;
    setLoadingSharedBooks(true);
    const sharedRef = collection(db, 'shared_books');
    const q = query(sharedRef, orderBy('sharedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const list = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setSharedBooks(list);
      }
      setLoadingSharedBooks(false);
    }, (err) => {
      console.warn("Could not load shared books from firestore, using defaults:", err);
      setLoadingSharedBooks(false);
    });
    return () => unsub();
  }, []);

  // Load Discussions for selected book
  useEffect(() => {
    if (!selectedBook || !db) {
      setBookComments([]);
      return;
    }
    const commentsRef = collection(db, 'shared_books', selectedBook.id, 'discussions');
    const q = query(commentsRef, orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setBookComments(list);
    }, (err) => {
      console.error("Failed to load discussions:", err);
    });
    return () => unsub();
  }, [selectedBook]);

  const handleAddComment = async (e) => {
    if (e) e.preventDefault();
    if (!newComment.trim() || !user || !selectedBook) return;
    try {
      const commentsRef = collection(db, 'shared_books', selectedBook.id, 'discussions');
      await addDoc(commentsRef, {
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Brother',
        userAvatar: user.photoURL || '',
        message: newComment.trim(),
        timestamp: new Date().toISOString(),
        likes: []
      });
      setNewComment('');
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleShareBook = async (e) => {
    if (e) e.preventDefault();
    if (!sharingBookForm.title.trim() || !sharingBookForm.author.trim()) return;
    setSharingBook(true);
    try {
      const sharedRef = collection(db, 'shared_books');
      await addDoc(sharedRef, {
        title: sharingBookForm.title.trim(),
        author: sharingBookForm.author.trim(),
        description: sharingBookForm.description.trim(),
        recommendedBy: user.uid,
        recommendedByName: user.displayName || user.email?.split('@')[0] || 'Anonym',
        activeReaderCount: 1,
        averageRating: 5,
        tags: sharingBookForm.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
        sharedAt: new Date().toISOString()
      });
      setSharingBookForm({ title: '', author: '', description: '', tags: '' });
      setShowAddSharedBook(false);
      alert('Buch erfolgreich mit dem Tribe geteilt!');
    } catch (err) {
      console.error("Failed to share book:", err);
      alert('Fehler beim Teilen des Buches.');
    } finally {
      setSharingBook(false);
    }
  };

  const podium = leaderboardUsers.slice(0, 3);
  // Visual podium order: rank 2 (left), rank 1 (center), rank 3 (right)
  const podiumOrder = [podium[1], podium[0], podium[2]];
  const restUsers = leaderboardUsers.slice(3, 12);
  const fmtPts = (n) => (n ?? 0).toLocaleString('de-DE');

  return (
    <div
      className="text-[#ECE8F2] w-full"
      style={{ '--theme-accent': '#D4A574', '--theme-accent-dim': 'rgba(212,165,116,0.12)', '--theme-accent-glow': 'rgba(212,165,116,0.18)' }}
    >
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-10 xl:gap-12">
        {/* LEFT / CENTER COLUMN */}
        <div className="flex-1 flex flex-col gap-12 min-w-0">
          {/* Editorial hero */}
          <section className="relative flex flex-col items-center text-center py-6">
            <div className="absolute inset-0 -z-10 pointer-events-none opacity-60"
              style={{ background: 'radial-gradient(ellipse at center, rgba(212,165,116,0.12), transparent 70%)' }} />
            <p className="font-mono text-[#D4A574] uppercase tracking-[0.2em] text-[11px] mb-4">
              Ranking &amp; Bookclub · Monatlich Active Score
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-light tracking-tight leading-tight">
              Die Bruderschaft <br /><span className="italic opacity-80">der Disziplin.</span>
            </h1>
          </section>

          {/* Top 3 Podium */}
          {loadingLeaderboard ? (
            <p className="text-center text-sm opacity-60">Lade Rangliste…</p>
          ) : podium.length > 0 && (
            <section className="flex justify-center items-end gap-4 sm:gap-6 min-h-[16rem]">
              {podiumOrder.map((u, i) => {
                if (!u) return <div key={`empty-${i}`} className="w-44 hidden sm:block" />;
                const isFirst = i === 1;
                const isMe = u.uid === user?.uid;
                return (
                  <div
                    key={u.uid}
                    className={`group bg-white/[0.03] backdrop-blur-md flex flex-col items-center p-6 relative transition-transform duration-500 hover:-translate-y-2 ${
                      isFirst
                        ? 'w-48 sm:w-56 h-56 rounded-t-3xl border z-10'
                        : 'w-40 sm:w-48 h-48 rounded-2xl border border-white/5'
                    }`}
                    style={isFirst ? { borderColor: 'rgba(212,165,116,0.4)', boxShadow: '0 0 40px -10px rgba(212,165,116,0.25)' } : undefined}
                  >
                    <div className={`absolute ${isFirst ? '-top-8' : '-top-6'} rounded-full p-1`}
                      style={isFirst ? { background: 'rgba(212,165,116,0.1)', border: '1px solid rgba(212,165,116,0.5)' } : { background: '#060509', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {isFirst ? (
                        <span className="material-symbols-outlined text-[#D4A574] w-10 h-10 flex items-center justify-center text-[24px]">emoji_events</span>
                      ) : (
                        <span className="font-mono text-white/60 text-sm w-8 h-8 flex items-center justify-center">{i === 0 ? 2 : 3}</span>
                      )}
                    </div>
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.username} className={`rounded-full object-cover mb-4 ${isFirst ? 'w-20 h-20 mt-4 border-2 border-[#D4A574]' : 'w-16 h-16 mt-2 border-2 border-white/10'}`} />
                    ) : (
                      <div className={`rounded-full object-cover mb-4 flex items-center justify-center font-serif ${isFirst ? 'w-20 h-20 mt-4 text-2xl border-2 border-[#D4A574]' : 'w-16 h-16 mt-2 text-xl border-2 border-white/10'}`}
                        style={{ background: 'rgba(255,255,255,0.06)' }}>
                        {(u.username || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <h3 className={`font-body text-white font-medium ${isFirst ? 'text-base' : 'text-sm'}`}>
                      {u.username}{isMe && <span className="text-[#D4A574]"> (Du)</span>}
                    </h3>
                    <p className={`font-mono tracking-widest uppercase mt-1 ${isFirst ? 'text-[12px] text-[#D4A574]' : 'text-[10px] text-white/40'}`}>
                      {fmtPts(u.weeklyScore)} PTS
                    </p>
                    <div className={`mt-auto rounded-full font-mono uppercase tracking-wider ${
                      isFirst ? 'px-4 py-1.5 text-[10px] text-[#D4A574]' : 'px-3 py-1 text-[9px] text-white/60'
                    }`}
                      style={isFirst ? { background: 'rgba(212,165,116,0.1)', border: '1px solid rgba(212,165,116,0.3)' } : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      Lvl {u.level}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* Leaderboard table */}
          <section className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="font-mono uppercase tracking-widest text-xs text-white/60">Gesamtranking</h3>
              <span className="font-mono text-[10px] text-[#D4A574] uppercase tracking-wider">Monatlich</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Rang', 'Name', 'Level', 'Points', 'Streak', 'Status'].map((h, idx) => (
                      <th key={h} className={`font-mono text-[10px] text-white/40 uppercase tracking-widest py-4 px-6 font-normal ${idx >= 3 ? 'text-right' : ''} ${idx === 4 ? 'text-center' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {restUsers.length === 0 && !loadingLeaderboard && (
                    <tr><td colSpan={6} className="py-6 px-6 text-center text-xs text-white/40">Noch keine weiteren Ränge.</td></tr>
                  )}
                  {restUsers.map((u, idx) => {
                    const rank = idx + 4;
                    const isMe = u.uid === user?.uid;
                    const active = (u.streakDays || 0) > 0;
                    return (
                      <tr key={u.uid} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${isMe ? 'bg-white/5' : ''}`}
                        style={isMe ? { borderLeft: '2px solid #D4A574' } : undefined}>
                        <td className={`py-4 px-6 font-mono text-sm ${isMe ? 'text-[#D4A574]' : 'text-white/60'}`}>{rank}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            {u.avatar ? (
                              <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[0.7rem]">
                                {(u.username || '?')[0].toUpperCase()}
                              </div>
                            )}
                            <span className={`font-body text-sm ${isMe ? 'text-[#D4A574] font-medium' : 'text-white/90'}`}>
                              {u.username}{isMe && ' (Du)'}
                            </span>
                          </div>
                        </td>
                        <td className={`py-4 px-6 font-mono text-xs ${isMe ? 'text-[#D4A574]' : 'text-white/60'}`}>Lvl {u.level}</td>
                        <td className={`py-4 px-6 font-mono text-sm text-right ${isMe ? 'text-[#D4A574]' : 'text-white/90'}`}>{fmtPts(u.weeklyScore)}</td>
                        <td className="py-4 px-6 text-center">
                          <span className="inline-flex items-center gap-1 font-mono text-xs" style={{ color: active ? '#D4A574' : 'rgba(255,255,255,0.4)' }}>
                            <span className="material-symbols-outlined text-[14px]" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>local_fire_department</span>
                            {u.streakDays || 0}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: active ? 'rgba(74,222,128,0.8)' : 'rgba(255,255,255,0.4)' }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? '#4ade80' : 'rgba(255,255,255,0.2)' }} />
                            {active ? 'Active' : 'Idle'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Tribe Bookclub */}
          <section>
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="font-serif text-3xl text-white font-light italic">Geteilte Weisheit</h2>
              <button
                onClick={() => setShowAddSharedBook(!showAddSharedBook)}
                className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full transition-colors"
                style={{ color: '#D4A574', background: 'rgba(212,165,116,0.1)', border: '1px solid rgba(212,165,116,0.3)' }}
              >
                {showAddSharedBook ? 'Abbrechen' : '⊕ Buch empfehlen'}
              </button>
            </div>

            {showAddSharedBook && (
              <form onSubmit={handleShareBook} className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 mb-6 flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" className={styles.searchInput} placeholder="Buchtitel..." value={sharingBookForm.title} onChange={e => setSharingBookForm(f => ({ ...f, title: e.target.value }))} required />
                  <input type="text" className={styles.searchInput} placeholder="Autor..." value={sharingBookForm.author} onChange={e => setSharingBookForm(f => ({ ...f, author: e.target.value }))} required />
                </div>
                <textarea className={styles.e2eTextarea} placeholder="Warum empfiehlst du dieses Buch?..." rows={3} value={sharingBookForm.description} onChange={e => setSharingBookForm(f => ({ ...f, description: e.target.value }))} />
                <input type="text" className={styles.searchInput} placeholder="Tags (z.B. stoizismus, gewohnheiten)..." value={sharingBookForm.tags} onChange={e => setSharingBookForm(f => ({ ...f, tags: e.target.value }))} />
                <button type="submit" className={styles.e2eBtn} style={{ alignSelf: 'flex-start', background: '#D4A574', color: '#000' }} disabled={sharingBook}>
                  {sharingBook ? 'Teile…' : 'Mit dem Tribe teilen'}
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {loadingSharedBooks ? (
                <p className="text-sm opacity-60">Lade Buchempfehlungen…</p>
              ) : sharedBooks.map(book => {
                const isSel = selectedBook?.id === book.id;
                return (
                  <div key={book.id}
                    className="group bg-white/[0.03] p-6 rounded-2xl flex flex-col border transition-colors"
                    style={{ borderColor: isSel ? 'rgba(212,165,116,0.4)' : 'rgba(255,255,255,0.05)' }}>
                    <div className="flex gap-6 mb-6">
                      <div className="w-24 h-36 rounded-lg border border-white/10 overflow-hidden relative shrink-0 flex items-center justify-center shadow-lg shadow-black/50"
                        style={{ background: '#060509' }}>
                        <span className="font-serif italic text-white/30 text-xs -rotate-90 whitespace-nowrap">{book.author}</span>
                      </div>
                      <div className="flex flex-col justify-between min-w-0">
                        <div>
                          <h3 className="font-serif text-xl text-white leading-tight mb-1 truncate">{book.title}</h3>
                          <p className="font-body text-sm text-white/60 mb-3 truncate">{book.author}</p>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-[#D4A574] text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            <span className="font-mono text-xs text-white/90">{book.averageRating || '5.0'}</span>
                            <span className="font-mono text-[10px] text-white/40 uppercase ml-2">Rating</span>
                          </div>
                        </div>
                        <div>
                          {book.recommendedByName && (
                            <p className="font-mono text-[9px] uppercase tracking-widest text-[#D4A574] mb-2 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">recommend</span> Empfohlen von {book.recommendedByName}
                            </p>
                          )}
                          <span className="font-mono text-[10px] text-white/40">{book.activeReaderCount || 1} aktive Leser</span>
                        </div>
                      </div>
                    </div>
                    <p className="font-body text-xs text-white/50 leading-relaxed line-clamp-2 mb-5">{book.description}</p>
                    <div className="flex gap-3 mt-auto">
                      <button onClick={() => setSelectedBook(book)}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-white font-mono text-[10px] uppercase tracking-wider py-2.5 rounded-lg border border-white/5 transition-colors">
                        Buch diskutieren
                      </button>
                      <button onClick={() => setSelectedBook(book)}
                        className="font-mono text-[10px] uppercase tracking-wider py-2.5 px-6 rounded-lg transition-colors"
                        style={{ color: '#D4A574', background: 'rgba(212,165,116,0.1)', border: '1px solid rgba(212,165,116,0.3)' }}>
                        Mitlesen
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-8">
          {/* Challenges */}
          <div className="bg-white/[0.03] border border-white/5 p-6 rounded-2xl backdrop-blur-md">
            <h4 className="font-mono text-xs uppercase tracking-widest text-white/60 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">flag</span> Tribe Challenges
            </h4>
            <div className="flex flex-col gap-5">
              {CHALLENGES.map((c, idx) => {
                const isJoined = !!joinedChallenges[c.id];
                const cks = challengeCheckins[c.id] || {};
                const daysChecked = Object.keys(cks).length;
                const pct = Math.min(100, Math.round((daysChecked / c.targetDays) * 100));
                const checkedToday = !!cks[dayKey(Date.now())];
                const streak = challengeStreak(cks);
                const members = challengeMembers[c.id] || 0;
                return (
                  <div key={c.id}>
                    {idx > 0 && <hr className="border-white/5 mb-5" />}
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="font-body text-sm text-white/90">{c.name}</span>
                      <span className="font-mono text-[10px]" style={{ color: isJoined ? '#D4A574' : 'rgba(255,255,255,0.6)' }}>
                        {isJoined ? `Tag ${daysChecked}/${c.targetDays}` : `${c.targetDays} Tage`}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${isJoined ? pct : 0}%`, background: isJoined ? '#D4A574' : 'rgba(255,255,255,0.4)' }} />
                    </div>
                    <p className="font-mono text-[9px] text-white/40 uppercase tracking-wider mt-2">
                      {members} Member{isJoined && streak > 0 ? ` · ${streak} Tage Streak` : ` · ${c.blurb}`}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => toggleJoinChallenge(c.id)}
                        className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-full transition-colors"
                        style={isJoined
                          ? { color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }
                          : { color: '#D4A574', background: 'rgba(212,165,116,0.1)', border: '1px solid rgba(212,165,116,0.3)' }}
                      >
                        {isJoined ? 'Verlassen' : 'Beitreten'}
                      </button>
                      {isJoined && (
                        <button
                          onClick={() => checkinChallenge(c.id)}
                          className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-full transition-colors flex-1"
                          style={checkedToday
                            ? { color: '#000', background: '#D4A574', border: '1px solid #D4A574' }
                            : { color: '#D4A574', background: 'rgba(212,165,116,0.1)', border: '1px solid rgba(212,165,116,0.3)' }}
                        >
                          {checkedToday ? '✓ Heute erledigt' : 'Heute abhaken'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bookclub Chatter — live discussion of the selected book */}
          <div className="bg-white/[0.03] border border-white/5 p-6 rounded-2xl backdrop-blur-md flex-1">
            <h4 className="font-mono text-xs uppercase tracking-widest text-white/60 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">forum</span> Bookclub Chatter
            </h4>
            {!selectedBook ? (
              <p className="font-body text-sm text-white/40 leading-relaxed">
                Wähle ein Buch aus „Geteilte Weisheit“, um die Diskussion der Bruderschaft zu sehen.
              </p>
            ) : bookComments.length === 0 ? (
              <p className="font-body text-sm text-white/40 leading-relaxed italic">
                Noch keine Gedanken zu <span className="not-italic text-white/70">{selectedBook.title}</span>. Sei der Erste.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {bookComments.slice(-4).reverse().map(c => (
                  <div key={c.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-body text-xs font-medium text-[#D4A574]">{c.userName}</span>
                      <span className="font-mono text-[9px] text-white/30">
                        {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="font-body text-sm text-white/70 leading-relaxed">{c.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* BOOK DISCUSSION PANEL */}
      {selectedBook && (
        <div className={styles.e2eCard} style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '1400px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>💬 Diskussion: {selectedBook.title}</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', opacity: 0.6 }}>Teile deine Notizen und Gedanken zu diesem Werk mit der Bruderschaft.</p>
            </div>
            <button className={styles.e2eBtn} style={{ padding: '0.3rem 0.8rem', fontSize: '0.7rem' }} onClick={() => setSelectedBook(null)}>Schließen ✕</button>
          </div>

          {/* Comment List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.5rem' }}>
            {bookComments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>
                  {c.userName[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#D4A574' }}>{c.userName}</span>
                    <span style={{ fontSize: '0.6rem', opacity: 0.4 }}>{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8, lineHeight: '1.4' }}>{c.message}</p>
                </div>
              </div>
            ))}
            {bookComments.length === 0 && (
              <p style={{ opacity: 0.5, fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', margin: '2rem 0' }}>
                Noch keine Gedanken geteilt. Schreibe den ersten Kommentar!
              </p>
            )}
          </div>

          {/* Write Comment Form */}
          <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              className={styles.searchInput}
              style={{ flex: 1 }}
              placeholder="Schreibe deine Erkenntnisse oder stelle eine Frage..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              required
            />
            <button type="submit" className={styles.e2eBtn} style={{ padding: '0 1.5rem', background: '#D4A574', color: '#000', fontWeight: 'bold' }}>Senden</button>
          </form>
        </div>
      )}
    </div>
  );
}
