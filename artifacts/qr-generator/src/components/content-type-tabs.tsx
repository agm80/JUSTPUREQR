import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  formatWifi,
  formatVCard,
  formatEmail,
  formatSMS,
  formatPhone,
  formatLocation,
  formatEvent,
  toICalUTC,
  ContentType
} from "@/lib/qr-formats";

interface ContentTypeTabsProps {
  onContentChange: (text: string, type: ContentType) => void;
}

const TAB_OPTIONS: { id: ContentType; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "url", label: "URL" },
  { id: "wifi", label: "WiFi" },
  { id: "vcard", label: "vCard" },
  { id: "email", label: "Email" },
  { id: "sms", label: "SMS" },
  { id: "phone", label: "Phone" },
  { id: "location", label: "Location" },
  { id: "event", label: "Event" },
];

export function ContentTypeTabs({ onContentChange }: ContentTypeTabsProps) {
  const [activeTab, setActiveTab] = useState<ContentType>("text");

  // States for all form types
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [wifiEncryption, setWifiEncryption] = useState<"WPA" | "WEP" | "nopass">("WPA");
  const [wifiHidden, setWifiHidden] = useState(false);

  const [vcFirst, setVcFirst] = useState("");
  const [vcLast, setVcLast] = useState("");
  const [vcOrg, setVcOrg] = useState("");
  const [vcTitle, setVcTitle] = useState("");
  const [vcPhone, setVcPhone] = useState("");
  const [vcEmail, setVcEmail] = useState("");
  const [vcWebsite, setVcWebsite] = useState("");
  const [vcAddress, setVcAddress] = useState("");

  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const [smsPhone, setSmsPhone] = useState("");
  const [smsMessage, setSmsMessage] = useState("");

  const [phone, setPhone] = useState("");

  const [locLat, setLocLat] = useState("");
  const [locLng, setLocLng] = useState("");

  const [eventTitle, setEventTitle] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [eventDesc, setEventDesc] = useState("");

  useEffect(() => {
    let result = "";
    switch (activeTab) {
      case "text":
        result = text;
        break;
      case "url":
        result = url;
        break;
      case "wifi":
        result = formatWifi(wifiSsid, wifiPassword, wifiEncryption, wifiHidden);
        break;
      case "vcard":
        result = formatVCard({
          firstName: vcFirst, lastName: vcLast, org: vcOrg, title: vcTitle,
          phone: vcPhone, email: vcEmail, website: vcWebsite, address: vcAddress
        });
        break;
      case "email":
        result = formatEmail(emailTo, emailSubject, emailBody);
        break;
      case "sms":
        result = formatSMS(smsPhone, smsMessage);
        break;
      case "phone":
        result = formatPhone(phone);
        break;
      case "location":
        result = formatLocation(locLat, locLng);
        break;
      case "event":
        const s = toICalUTC(eventStart);
        const e = toICalUTC(eventEnd);
        if (eventTitle && eventStart && eventEnd) {
          result = formatEvent({
            title: eventTitle, location: eventLocation,
            startDate: s, endDate: e, description: eventDesc
          });
        }
        break;
    }
    onContentChange(result, activeTab);
  }, [
    activeTab, text, url,
    wifiSsid, wifiPassword, wifiEncryption, wifiHidden,
    vcFirst, vcLast, vcOrg, vcTitle, vcPhone, vcEmail, vcWebsite, vcAddress,
    emailTo, emailSubject, emailBody,
    smsPhone, smsMessage,
    phone,
    locLat, locLng,
    eventTitle, eventLocation, eventStart, eventEnd, eventDesc,
    onContentChange
  ]);

  return (
    <div className="w-full space-y-6">
      {/* Custom Pill Tabs */}
      <div className="relative flex flex-wrap gap-2.5 pb-2" role="tablist" aria-label="Content type">
        {TAB_OPTIONS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={`${tab.label} content type`}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
                isActive
                  ? "text-primary-foreground border-transparent"
                  : "text-muted-foreground border-black/10 dark:border-white/10 hover:text-foreground hover:bg-muted/50 hover:border-black/20 dark:hover:border-white/20"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-foreground rounded-full"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="relative bg-muted/20 p-5 rounded-2xl border border-border/40">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "text" && (
              <div className="space-y-2">
                <Label htmlFor="ct-text" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Text Content</Label>
                <Textarea 
                  id="ct-text"
                  aria-label="Text content"
                  value={text} onChange={e => setText(e.target.value)} 
                  placeholder="Enter text..." className="min-h-[120px] resize-none bg-background rounded-xl border-border/40 focus-visible:ring-primary shadow-sm"
                />
              </div>
            )}

            {activeTab === "url" && (
              <div className="space-y-2">
                <Label htmlFor="ct-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Website URL</Label>
                <Input 
                  id="ct-url"
                  aria-label="Website URL"
                  type="url" value={url} onChange={e => setUrl(e.target.value)} 
                  placeholder="https://example.com" className="bg-background rounded-xl border-border/40 h-11 focus-visible:ring-primary shadow-sm"
                />
              </div>
            )}

            {activeTab === "wifi" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ct-wifi-ssid" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Network Name (SSID)</Label>
                  <Input id="ct-wifi-ssid" aria-label="WiFi network name (SSID)" value={wifiSsid} onChange={e => setWifiSsid(e.target.value)} className="bg-background rounded-xl border-border/40 h-11 focus-visible:ring-primary shadow-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ct-wifi-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
                    <Input id="ct-wifi-password" aria-label="WiFi password" type="password" value={wifiPassword} onChange={e => setWifiPassword(e.target.value)} className="bg-background rounded-xl border-border/40 h-11 focus-visible:ring-primary shadow-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ct-wifi-enc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Encryption</Label>
                    <Select value={wifiEncryption} onValueChange={(v: any) => setWifiEncryption(v)}>
                      <SelectTrigger id="ct-wifi-enc" aria-label="WiFi encryption type" className="bg-background rounded-xl border-border/40 h-11 focus-visible:ring-primary shadow-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WPA">WPA/WPA2</SelectItem>
                        <SelectItem value="WEP">WEP</SelectItem>
                        <SelectItem value="nopass">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-background shadow-sm">
                  <Label htmlFor="wifi-hidden" className="text-sm font-medium cursor-pointer">Hidden Network</Label>
                  <Switch checked={wifiHidden} onCheckedChange={setWifiHidden} id="wifi-hidden" aria-label="Hidden WiFi network" />
                </div>
              </div>
            )}

            {activeTab === "vcard" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="ct-vc-first" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">First Name</Label><Input id="ct-vc-first" aria-label="First name" value={vcFirst} onChange={e => setVcFirst(e.target.value)} className="bg-background rounded-xl border-border/40 h-10 shadow-sm" /></div>
                  <div className="space-y-2"><Label htmlFor="ct-vc-last" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Name</Label><Input id="ct-vc-last" aria-label="Last name" value={vcLast} onChange={e => setVcLast(e.target.value)} className="bg-background rounded-xl border-border/40 h-10 shadow-sm" /></div>
                  <div className="space-y-2"><Label htmlFor="ct-vc-org" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organization</Label><Input id="ct-vc-org" aria-label="Organization" value={vcOrg} onChange={e => setVcOrg(e.target.value)} className="bg-background rounded-xl border-border/40 h-10 shadow-sm" /></div>
                  <div className="space-y-2"><Label htmlFor="ct-vc-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</Label><Input id="ct-vc-title" aria-label="Job title" value={vcTitle} onChange={e => setVcTitle(e.target.value)} className="bg-background rounded-xl border-border/40 h-10 shadow-sm" /></div>
                  <div className="space-y-2"><Label htmlFor="ct-vc-phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</Label><Input id="ct-vc-phone" aria-label="Phone number" value={vcPhone} onChange={e => setVcPhone(e.target.value)} className="bg-background rounded-xl border-border/40 h-10 shadow-sm" /></div>
                  <div className="space-y-2"><Label htmlFor="ct-vc-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label><Input id="ct-vc-email" aria-label="Email address" value={vcEmail} onChange={e => setVcEmail(e.target.value)} className="bg-background rounded-xl border-border/40 h-10 shadow-sm" /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="ct-vc-website" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Website</Label><Input id="ct-vc-website" aria-label="Website URL" value={vcWebsite} onChange={e => setVcWebsite(e.target.value)} className="bg-background rounded-xl border-border/40 h-10 shadow-sm" /></div>
                <div className="space-y-2"><Label htmlFor="ct-vc-address" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</Label><Input id="ct-vc-address" aria-label="Postal address" value={vcAddress} onChange={e => setVcAddress(e.target.value)} className="bg-background rounded-xl border-border/40 h-10 shadow-sm" /></div>
              </div>
            )}

            {activeTab === "email" && (
              <div className="space-y-4">
                <div className="space-y-2"><Label htmlFor="ct-email-to" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email To</Label><Input id="ct-email-to" aria-label="Recipient email address" type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} className="bg-background rounded-xl border-border/40 h-11 shadow-sm" /></div>
                <div className="space-y-2"><Label htmlFor="ct-email-subj" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</Label><Input id="ct-email-subj" aria-label="Email subject" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="bg-background rounded-xl border-border/40 h-11 shadow-sm" /></div>
                <div className="space-y-2"><Label htmlFor="ct-email-body" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Body</Label><Textarea id="ct-email-body" aria-label="Email body" value={emailBody} onChange={e => setEmailBody(e.target.value)} className="min-h-[100px] resize-none bg-background rounded-xl border-border/40 shadow-sm" /></div>
              </div>
            )}

            {activeTab === "sms" && (
              <div className="space-y-4">
                <div className="space-y-2"><Label htmlFor="ct-sms-phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</Label><Input id="ct-sms-phone" aria-label="SMS phone number" type="tel" value={smsPhone} onChange={e => setSmsPhone(e.target.value)} className="bg-background rounded-xl border-border/40 h-11 shadow-sm" /></div>
                <div className="space-y-2"><Label htmlFor="ct-sms-msg" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</Label><Textarea id="ct-sms-msg" aria-label="SMS message" value={smsMessage} onChange={e => setSmsMessage(e.target.value)} className="min-h-[100px] resize-none bg-background rounded-xl border-border/40 shadow-sm" /></div>
              </div>
            )}

            {activeTab === "phone" && (
              <div className="space-y-2">
                <Label htmlFor="ct-phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</Label><Input id="ct-phone" aria-label="Phone number" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="bg-background rounded-xl border-border/40 h-11 shadow-sm" />
              </div>
            )}

            {activeTab === "location" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="ct-loc-lat" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Latitude</Label><Input id="ct-loc-lat" aria-label="Latitude" value={locLat} onChange={e => setLocLat(e.target.value)} placeholder="e.g. 40.7128" className="bg-background rounded-xl border-border/40 h-11 shadow-sm" /></div>
                <div className="space-y-2"><Label htmlFor="ct-loc-lng" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Longitude</Label><Input id="ct-loc-lng" aria-label="Longitude" value={locLng} onChange={e => setLocLng(e.target.value)} placeholder="e.g. -74.0060" className="bg-background rounded-xl border-border/40 h-11 shadow-sm" /></div>
              </div>
            )}

            {activeTab === "event" && (
              <div className="space-y-4">
                <div className="space-y-2"><Label htmlFor="ct-evt-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Event Title</Label><Input id="ct-evt-title" aria-label="Event title" value={eventTitle} onChange={e => setEventTitle(e.target.value)} className="bg-background rounded-xl border-border/40 h-10 shadow-sm" /></div>
                <div className="space-y-2"><Label htmlFor="ct-evt-loc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</Label><Input id="ct-evt-loc" aria-label="Event location" value={eventLocation} onChange={e => setEventLocation(e.target.value)} className="bg-background rounded-xl border-border/40 h-10 shadow-sm" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="ct-evt-start" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start Date/Time</Label><Input id="ct-evt-start" aria-label="Event start date and time" type="datetime-local" value={eventStart} onChange={e => setEventStart(e.target.value)} className="bg-background rounded-xl border-border/40 h-10 shadow-sm" /></div>
                  <div className="space-y-2"><Label htmlFor="ct-evt-end" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">End Date/Time</Label><Input id="ct-evt-end" aria-label="Event end date and time" type="datetime-local" value={eventEnd} onChange={e => setEventEnd(e.target.value)} className="bg-background rounded-xl border-border/40 h-10 shadow-sm" /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="ct-evt-desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label><Textarea id="ct-evt-desc" aria-label="Event description" value={eventDesc} onChange={e => setEventDesc(e.target.value)} className="min-h-[80px] resize-none bg-background rounded-xl border-border/40 shadow-sm" /></div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
