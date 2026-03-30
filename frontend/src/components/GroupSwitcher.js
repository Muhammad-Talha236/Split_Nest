import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const GroupSwitcher = () => {
  const { myGroups, activeGroupId, switchGroup } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!myGroups || myGroups.length === 0) return null;

  const activeGroup = myGroups.find(
    (group) => (group.groupId?._id || group.groupId)?.toString() === activeGroupId?.toString()
  );

  const activeName = activeGroup?.groupId?.name || activeGroup?.groupId || 'Select Group';

  const handleSwitch = async (groupId) => {
    setOpen(false);
    if (groupId?.toString() === activeGroupId?.toString()) return;

    const ok = await switchGroup(groupId);
    if (ok) {
      toast.success('Group switched!');
      navigate('/dashboard');
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 12px',
          borderRadius: 999,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text)',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          maxWidth: 200,
          boxShadow: 'var(--shadow)',
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 8,
            background: 'var(--accent-soft)',
            border: '1px solid var(--accent-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 900,
            color: 'var(--accent)',
            flexShrink: 0,
          }}
        >
          {typeof activeName === 'string' ? activeName[0]?.toUpperCase() : 'G'}
        </span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 122 }}>
          {typeof activeName === 'string' ? activeName : 'Select Group'}
        </span>
        <span
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform .2s ease',
          }}
        >
          v
        </span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            left: 0,
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
            borderRadius: 18,
            minWidth: 240,
            maxWidth: 300,
            boxShadow: 'var(--shadow-md)',
            zIndex: 999,
            overflow: 'hidden',
            animation: 'fadeIn .15s ease',
          }}
        >
          <div
            style={{
              padding: '12px 14px 8px',
              fontSize: 10,
              color: 'var(--text-muted)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            }}
          >
            My Groups ({myGroups.length})
          </div>

          {myGroups.map((group) => {
            const groupId = (group.groupId?._id || group.groupId)?.toString();
            const groupName = group.groupId?.name || 'Unknown Group';
            const isActive = groupId === activeGroupId?.toString();

            return (
              <div
                key={groupId}
                onClick={() => handleSwitch(groupId)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'background-color .15s ease',
                }}
                onMouseEnter={(event) => {
                  if (!isActive) event.currentTarget.style.background = 'var(--surface-elevated)';
                }}
                onMouseLeave={(event) => {
                  if (!isActive) event.currentTarget.style.background = 'transparent';
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 10,
                    flexShrink: 0,
                    background: isActive ? 'var(--accent-soft)' : 'var(--surface)',
                    border: `1px solid ${isActive ? 'var(--accent-glow)' : 'var(--border)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: 12,
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                >
                  {groupName[0]?.toUpperCase()}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 13,
                      color: isActive ? 'var(--accent)' : 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {groupName}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {group.role}
                  </div>
                </div>

                {isActive && <span style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0 }}>ON</span>}
              </div>
            );
          })}

          <div style={{ borderTop: '1px solid var(--border)', padding: '8px 14px' }}>
            <div
              onClick={() => {
                setOpen(false);
                navigate('/groups');
              }}
              style={{
                fontSize: 12,
                color: 'var(--accent)',
                fontWeight: 800,
                cursor: 'pointer',
                padding: '6px 0',
              }}
            >
              Browse all groups →
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupSwitcher;
