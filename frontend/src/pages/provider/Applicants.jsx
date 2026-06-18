import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { io } from 'socket.io-client';
import { Brain, User, Calendar, MapPin, Send, MessageSquare, Clipboard, Mail, Sparkles, BookOpen } from 'lucide-react';

const Applicants = () => {
  const { id: jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected candidate details modal
  const [selectedApp, setSelectedApp] = useState(null); // application object
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Chat Drawer/Modal
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // UI state for status updating
  const [statusLoading, setStatusLoading] = useState(false);
  const [prepLoading, setPrepLoading] = useState(false);

  const fetchApplicants = async () => {
    try {
      const [jobRes, appsRes] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get(`/applications/job/${jobId}`)
      ]);

      if (jobRes.data?.success) setJob(jobRes.data.data);
      if (appsRes.data?.success) setApplicants(appsRes.data.data);
    } catch (err) {
      console.error('Failed to load job applicants:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, [jobId]);

  // Clean socket connection when chat modal changes
  useEffect(() => {
    if (isChatOpen && selectedApp) {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
      const token = localStorage.getItem('fursad_provider_token');

      // Initialize Socket connection
      socketRef.current = io(socketUrl, {
        auth: { token }
      });

      // Join application room
      socketRef.current.emit('joinApplication', selectedApp._id);

      // Listen for previous messages
      socketRef.current.on('previousMessages', (messages) => {
        setChatMessages(messages);
        scrollToBottom();
      });

      // Listen for new messages
      socketRef.current.on('newMessage', (msg) => {
        setChatMessages((prev) => [...prev, msg]);
        scrollToBottom();
      });

      socketRef.current.on('errorMsg', (err) => {
        console.error('Socket error:', err.message);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [isChatOpen, selectedApp]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleUpdateStatus = async (appId, newStatus) => {
    setStatusLoading(true);
    try {
      const res = await api.put(`/applications/${appId}/status`, {
        status: newStatus,
        note: `Status updated by employer to ${newStatus}`
      });

      if (res.data?.success) {
        // Refresh local details
        fetchApplicants();
        if (selectedApp && selectedApp._id === appId) {
          setSelectedApp(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      alert('Failed to update status: ' + (err.response?.data?.message || err.message));
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSendPrep = async (appId) => {
    setPrepLoading(true);
    try {
      const res = await api.post(`/applications/${appId}/interview-prep`);
      if (res.data?.success) {
        alert('AI Interview Prep materials generated and emailed to candidate successfully!');
        fetchApplicants();
      }
    } catch (err) {
      alert('Failed to generate interview prep materials');
    } finally {
      setPrepLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socketRef.current) return;

    socketRef.current.emit('sendMessage', {
      applicationId: selectedApp._id,
      recipientId: selectedApp.jobseeker._id,
      content: newMessage.trim()
    });

    setNewMessage('');
  };

  const handleOpenChat = (app) => {
    setSelectedApp(app);
    setIsChatOpen(true);
  };

  const handleOpenDetail = (app) => {
    setSelectedApp(app);
    setIsDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00C27C]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Job Info Card */}
      <Card className="flex items-center justify-between border-brand-green/20 bg-brand-green/5">
        <div>
          <span className="text-[10px] uppercase font-mono text-brand-green font-bold">Workspace Job Listing</span>
          <h2 className="text-xl font-bold text-text-primary mt-1">{job?.title}</h2>
          <p className="text-sm text-text-secondary mt-0.5">{job?.location?.city}, {job?.location?.country} • {job?.employmentType}</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/provider/jobs')}>← Back to Jobs</Button>
      </Card>

      {/* Ranked Applicants */}
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-text-primary">Ranked Candidates (AI Score compatibility)</h3>
        
        {applicants.length === 0 ? (
          <Card className="text-center py-12 text-text-secondary">No candidates have applied to this job yet.</Card>
        ) : (
          applicants.map((app) => (
            <Card
              key={app._id}
              className="flex flex-col gap-4 hover:border-brand-green transition-all"
            >
              {/* Row 1: Candidate summary and match score */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
                <div>
                  <h4 className="font-bold text-base text-text-primary">{app.jobseeker?.name}</h4>
                  <p className="text-xs text-text-secondary mt-0.5">{app.jobseekerProfile?.headline || 'Software Specialist'}</p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end">
                    <Badge variant="success" className="gap-1.5 px-3 py-1 font-extrabold text-sm">
                      <Sparkles size={14} /> {app.matchScore}% Match
                    </Badge>
                  </div>
                  
                  <Badge variant={
                    app.status === 'rejected' ? 'danger' : 
                    app.status === 'hired' ? 'success' : 'info'
                  } className="capitalize">
                    {app.status}
                  </Badge>
                </div>
              </div>

              {/* Row 2: AI Summary text */}
              {app.aiSummary && (
                <div className="bg-bg-elevated/40 border border-border-subtle p-4 rounded-card flex gap-3 text-xs leading-relaxed text-text-secondary">
                  <Brain size={18} className="text-brand-green shrink-0 mt-0.5" />
                  <span><strong>AI Match summary:</strong> {app.aiSummary}</span>
                </div>
              )}

              {/* Row 3: Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={app.status}
                    disabled={statusLoading}
                    onChange={(e) => handleUpdateStatus(app._id, e.target.value)}
                    className="px-3 h-9 bg-bg-surface border border-border-subtle focus:border-brand-green focus:outline-none rounded-input text-xs text-text-primary"
                  >
                    <option value="applied">Applied</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interview">Interview</option>
                    <option value="offer">Offer</option>
                    <option value="hired">Hired</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  {(app.status === 'shortlisted' || app.status === 'interview') && (
                    <Button 
                      variant="secondary" 
                      className="h-9 text-xs gap-1.5" 
                      onClick={() => handleSendPrep(app._id)}
                      disabled={prepLoading || app.interviewPrepSent}
                    >
                      <Mail size={14} /> {app.interviewPrepSent ? 'Prep Email Sent' : 'Send AI Prep Email'}
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="ghost" className="h-9 text-xs gap-1.5" onClick={() => handleOpenChat(app)}>
                    <MessageSquare size={14} /> Chat Direct
                  </Button>
                  <Button variant="secondary" className="h-9 text-xs" onClick={() => handleOpenDetail(app)}>
                    View CV Details →
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Candidate CV Details Modal */}
      {selectedApp && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Candidate Profile - ${selectedApp.jobseeker?.name}`}
          className="max-w-2xl"
        >
          <div className="flex flex-col gap-6 text-sm text-text-secondary leading-relaxed">
            {/* Header info */}
            <div className="bg-bg-elevated p-4 rounded-card border border-border-subtle">
              <h4 className="font-bold text-text-primary text-base flex items-center gap-2">
                <User size={18} className="text-brand-green" />
                {selectedApp.jobseeker?.name}
              </h4>
              <p className="text-xs text-text-secondary mt-1">{selectedApp.jobseekerProfile?.headline || 'Specialist'}</p>
              <div className="flex items-center gap-4 text-xs text-text-muted mt-3">
                <span className="flex items-center gap-1"><MapPin size={12} /> {selectedApp.jobseekerProfile?.location?.city || 'Somalia'}</span>
                <span>•</span>
                <span>Contact: {selectedApp.jobseeker?.phone || 'N/A'}</span>
              </div>
            </div>

            {/* Cover Note */}
            <div>
              <h5 className="font-bold text-text-primary mb-2 flex items-center gap-1.5">
                <Clipboard size={16} className="text-brand-green" />
                Submitted Cover Note
              </h5>
              <div className="bg-bg-primary/50 border border-border-subtle p-4 rounded-card text-xs text-text-secondary leading-relaxed whitespace-pre-line font-mono">
                {selectedApp.coverNote || 'No cover note submitted.'}
              </div>
            </div>

            {/* Skills */}
            <div>
              <h5 className="font-bold text-text-primary mb-2">Technical Skills</h5>
              <div className="flex flex-wrap gap-2">
                {selectedApp.jobseekerProfile?.skills?.map((s, i) => <Badge key={i}>{s}</Badge>)}
              </div>
            </div>

            {/* Education */}
            <div>
              <h5 className="font-bold text-text-primary mb-3 flex items-center gap-1.5">
                <BookOpen size={16} className="text-brand-green" /> Academic Background
              </h5>
              <div className="flex flex-col gap-3">
                {selectedApp.jobseekerProfile?.education?.map((edu, idx) => (
                  <div key={idx} className="bg-bg-elevated/40 border border-border-subtle p-3 rounded-card text-xs">
                    <span className="font-bold text-text-primary">{edu.level} in {edu.fieldOfStudy}</span>
                    <p className="text-text-secondary mt-1">{edu.institution} • {edu.startYear} - {edu.endYear}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Experience */}
            <div>
              <h5 className="font-bold text-text-primary mb-3 flex items-center gap-1.5">
                <Briefcase size={16} className="text-brand-green" /> Professional Work History
              </h5>
              <div className="flex flex-col gap-3">
                {selectedApp.jobseekerProfile?.experience?.map((exp, idx) => (
                  <div key={idx} className="bg-bg-elevated/40 border border-border-subtle p-3 rounded-card text-xs">
                    <span className="font-bold text-text-primary">{exp.title}</span>
                    <p className="text-brand-green mt-0.5">{exp.company}</p>
                    <p className="text-text-muted mt-1 font-mono text-[10px]">
                      {exp.startDate ? new Date(exp.startDate).toLocaleDateString() : 'N/A'} - {exp.endDate ? new Date(exp.endDate).toLocaleDateString() : 'Present'}
                    </p>
                    {exp.description && <p className="text-text-secondary mt-2 leading-normal">{exp.description}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-border-subtle pt-4">
              <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Real-time Socket Chat Drawer/Modal */}
      {selectedApp && (
        <Modal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          title={`Chat with ${selectedApp.jobseeker?.name}`}
          className="max-w-md"
        >
          <div className="flex flex-col h-[50vh]">
            {/* Chat Body messages */}
            <div className="flex-grow overflow-y-auto flex flex-col gap-3 pr-1 mb-4">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-text-muted text-center my-auto">Start a conversation. Type a message below.</p>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.sender.toString() === selectedApp.job.postedBy.toString();
                  return (
                    <div 
                      key={msg._id} 
                      className={`flex flex-col max-w-[80%] rounded-card p-3 text-xs leading-normal ${
                        msg.isAutomated
                          ? 'self-center bg-bg-elevated text-text-muted italic border border-border-subtle text-center'
                          : isMe 
                            ? 'self-end bg-brand-green text-bg-primary font-medium rounded-tr-none' 
                            : 'self-start bg-bg-surface text-text-primary rounded-tl-none border border-border-subtle'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <span className={`text-[8px] block mt-1.5 text-right ${isMe ? 'text-bg-primary/70' : 'text-text-muted'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-border-subtle pt-4">
              <input
                type="text"
                placeholder="Type message here..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                required
                className="flex-grow px-4 h-btn bg-bg-surface border border-border-subtle focus:border-brand-green focus:outline-none rounded-input text-xs text-text-primary"
              />
              <Button type="submit" variant="primary" className="h-btn px-4">
                <Send size={16} />
              </Button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Applicants;
