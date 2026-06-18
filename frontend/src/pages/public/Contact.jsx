import React, { useState } from 'react';
import { Mail, MapPin, Phone, MessageSquare } from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [success, setSuccess] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccess('Thank you for contacting us! Our support team will respond shortly.');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="bg-bg-primary text-text-primary py-20 px-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
      {/* Contact Details */}
      <div className="flex flex-col justify-center">
        <h1 className="text-4xl font-extrabold mb-6">Contact Fursad Support</h1>
        <p className="text-text-secondary mb-10 leading-relaxed text-base">
          Have an inquiry about platform integration, recruiter API packages, or general usage issues? Shoot us a message or visit our Mogadishu headquarters.
        </p>

        <div className="flex flex-col gap-6 text-text-secondary">
          <div className="flex gap-4">
            <div className="p-3 bg-brand-green/10 text-brand-green rounded-full h-fit">
              <MapPin size={20} />
            </div>
            <div>
              <h4 className="font-bold text-text-primary">Office Location</h4>
              <p className="text-sm">Hodan District, Mogadishu, Somalia</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="p-3 bg-brand-green/10 text-brand-green rounded-full h-fit">
              <Phone size={20} />
            </div>
            <div>
              <h4 className="font-bold text-text-primary">Phone Inquiries</h4>
              <p className="text-sm">+252 61 234567</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="p-3 bg-brand-green/10 text-brand-green rounded-full h-fit">
              <Mail size={20} />
            </div>
            <div>
              <h4 className="font-bold text-text-primary">Email Support</h4>
              <p className="text-sm">support@fursad.so</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Form */}
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="text-brand-green" />
          <h3 className="text-xl font-bold">Write a Message</h3>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Your Name"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            type="email"
            label="Email Address"
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            label="Subject"
            placeholder="How can we help?"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
          />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-text-secondary">Message Content</label>
            <textarea
              placeholder="Describe your issue or inquiry in detail..."
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
              className="w-full px-4 py-3 bg-bg-surface border border-border-subtle focus:border-brand-green focus:outline-none rounded-input text-text-primary placeholder:text-text-muted transition-colors duration-200"
            />
          </div>

          {success && <span className="text-sm text-success font-semibold">{success}</span>}

          <Button type="submit" variant="primary">Submit Request</Button>
        </form>
      </Card>
    </div>
  );
};

export default Contact;
