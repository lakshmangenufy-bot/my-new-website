/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EmergencyContact, MedicalProfile } from '../types';
import {
  PhoneCall,
  X,
  Volume2,
  VolumeX,
  AlertTriangle,
  User,
  ShieldAlert,
  Send,
  HeartPulse,
  MapPin,
  Check,
  Edit2,
  Save,
} from 'lucide-react';
import { startAlarmSound, stopAlarmSound, speakText } from '../utils/speech';

interface EmergencySOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: EmergencyContact[];
  onUpdateContacts: (contacts: EmergencyContact[]) => void;
  medicalProfile: MedicalProfile;
}

export const EmergencySOSModal: React.FC<EmergencySOSModalProps> = ({
  isOpen,
  onClose,
  contacts,
  onUpdateContacts,
  medicalProfile,
}) => {
  const [alarmActive, setAlarmActive] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [tempPhone, setTempPhone] = useState('');
  const [smsSent, setSmsSent] = useState(false);

  if (!isOpen) return null;

  const handleToggleAlarm = () => {
    if (!alarmActive) {
      setAlarmActive(true);
      startAlarmSound();
      speakText('Emergency alarm activated. Help is on the way.');
    } else {
      setAlarmActive(false);
      stopAlarmSound();
    }
  };

  const handleCloseModal = () => {
    if (alarmActive) {
      setAlarmActive(false);
      stopAlarmSound();
    }
    onClose();
  };

  const handleSendFamilyAlert = (contact: EmergencyContact) => {
    setSmsSent(true);
    speakText(`Sending alert notification to ${contact.name}.`);
    // Pre-filled SMS link
    const textMsg = encodeURIComponent(
      `URGENT StrokeCare Alert: Arthur Miller requires immediate assistance. Please check in or call.`
    );
    window.location.href = `sms:${contact.phone}?&body=${textMsg}`;
    setTimeout(() => setSmsSent(false), 5000);
  };

  const handleStartEditContact = (contact: EmergencyContact) => {
    setEditingContactId(contact.id);
    setTempPhone(contact.phone);
  };

  const handleSaveContact = (contactId: string) => {
    const updated = contacts.map((c) => (c.id === contactId ? { ...c, phone: tempPhone } : c));
    onUpdateContacts(updated);
    setEditingContactId(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="emergency-sos-title"
        className="bg-white rounded-3xl border-2 border-rose-500 max-w-2xl w-full shadow-2xl overflow-hidden card-surface animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header Alert Bar */}
        <div className="bg-rose-600 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-2xl">
              <PhoneCall className="w-7 h-7 animate-bounce" />
            </div>
            <div>
              <h2 id="emergency-sos-title" className="text-xl sm:text-2xl font-black tracking-tight">
                Emergency Assistance Hub
              </h2>
              <p className="text-xs sm:text-sm text-rose-100 font-medium">
                Immediate dispatch & In-Case-of-Emergency (ICE) family contact
              </p>
            </div>
          </div>

          <button
            onClick={handleCloseModal}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Close emergency modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Primary 911 Call & Household Siren Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Direct 911 Call Button */}
            <a
              href="tel:911"
              className="p-5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-2xl flex flex-col items-center justify-center text-center shadow-lg shadow-rose-600/30 transition-all min-h-[90px] cursor-pointer group"
            >
              <span className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                <PhoneCall className="w-7 h-7" />
                Call 911
              </span>
              <span className="text-xs font-semibold text-rose-100 mt-1">
                Toll-Free Emergency Dispatch
              </span>
            </a>

            {/* Household Siren / Alarm Tone */}
            <button
              onClick={handleToggleAlarm}
              className={`p-5 rounded-2xl flex flex-col items-center justify-center text-center border-2 transition-all min-h-[90px] cursor-pointer ${
                alarmActive
                  ? 'bg-amber-500 border-amber-600 text-slate-950 animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 text-lg sm:text-xl font-bold">
                {alarmActive ? <VolumeX className="w-6 h-6 text-slate-950" /> : <Volume2 className="w-6 h-6 text-slate-700" />}
                <span>{alarmActive ? 'Silence Siren' : 'Sound Home Siren'}</span>
              </div>
              <span className="text-xs font-medium text-slate-600 mt-1">
                {alarmActive ? 'Loud alert currently sounding' : 'Attract attention in the house'}
              </span>
            </button>
          </div>

          {/* FAST Warning Reminder */}
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-950 space-y-2">
            <span className="font-black text-rose-800 text-sm block flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Recurrent Stroke Symptoms (Act F.A.S.T.)
            </span>
            <p>
              If Arthur has sudden face drooping, weakness or numbness in one arm/leg, slurred speech, or loss of balance, do NOT drive to the hospital—dial 911 immediately for emergency stroke protocol.
            </p>
          </div>

          {/* Family ICE Contacts */}
          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-teal-600" />
              In Case of Emergency (ICE) Contacts
            </h3>

            <div className="space-y-3">
              {contacts.map((contact) => {
                const isEditing = editingContactId === contact.id;

                return (
                  <div
                    key={contact.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">
                          {contact.name}
                        </span>
                        {contact.isPrimary && (
                          <span className="text-[11px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                            Primary ICE
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 block">
                        {contact.relationship}
                      </span>

                      {isEditing ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="text"
                            value={tempPhone}
                            onChange={(e) => setTempPhone(e.target.value)}
                            className="text-xs px-2 py-1 border border-slate-300 rounded bg-white"
                          />
                          <button
                            onClick={() => handleSaveContact(contact.id)}
                            className="p-1 text-teal-700 hover:text-teal-900"
                            title="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-semibold text-slate-800 font-mono">
                            {contact.phone}
                          </span>
                          <button
                            onClick={() => handleStartEditContact(contact)}
                            className="text-slate-400 hover:text-slate-700"
                            title="Edit phone number"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Action buttons: Call & Send SMS */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleSendFamilyAlert(contact)}
                        className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors min-h-[40px] cursor-pointer"
                        title="Send SMS alert"
                      >
                        <Send className="w-3.5 h-3.5 text-teal-600" />
                        <span>SMS Alert</span>
                      </button>

                      <a
                        href={`tel:${contact.phone.replace(/[^0-9]/g, '')}`}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors min-h-[40px] cursor-pointer"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Medical Profile ID for First Responders */}
          <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4" />
                Paramedic & First Responder Card
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: SC-7829-AM</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Patient Name:</span>
                <span className="font-bold text-slate-100 text-sm">{medicalProfile.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Blood Type:</span>
                <span className="font-bold text-slate-100">{medicalProfile.bloodType}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Primary Neurologist:</span>
                <span className="font-bold text-slate-100">Dr. Robert Evans</span>
              </div>
              <div>
                <span className="text-slate-400 block">Preferred Hospital:</span>
                <span className="font-bold text-slate-100 truncate">{medicalProfile.primaryHospital}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">Known Drug Allergies:</span>
                <span className="font-bold text-rose-400">{medicalProfile.allergies}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">Clinical Notes:</span>
                <span className="text-slate-300">{medicalProfile.emergencyNotes}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            StrokeCare AI Safety Protocol is active 24/7.
          </span>
          <button
            onClick={handleCloseModal}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer min-h-[44px]"
          >
            Close Safety Hub
          </button>
        </div>
      </div>
    </div>
  );
};
