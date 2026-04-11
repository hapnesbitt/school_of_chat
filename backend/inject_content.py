"""
inject_content.py — adds a `content` field to every knowledge lesson in lessons.yaml.
Uses text-based insertion to preserve all comments and formatting.
Run once: python3 inject_content.py
"""

import re

CONTENT = {

    # ── GMP Essentials ──────────────────────────────────────────────────────

    "gmp-what-is-gmp": """\
Good Manufacturing Practice (GMP) is a regulatory framework that ensures products are \
consistently manufactured and controlled to quality standards appropriate for their intended \
use. It was developed in direct response to historical disasters — most notably the 1937 \
sulfanilamide mass poisoning in the United States, where over 100 people died because a \
solvent was used without safety testing, and the thalidomide tragedy of the late 1950s, \
which caused severe birth defects when a sedative was marketed without adequate testing. \
These events demonstrated that relying on manufacturers to self-regulate was insufficient, \
and GMP regulations were created to mandate minimum standards.

GMP applies across pharmaceuticals, biologics, medical devices, active pharmaceutical \
ingredients (APIs), food, and cosmetics. In the pharmaceutical sector, the regulations are \
set and enforced by national authorities: the FDA in the United States (21 CFR Parts 210/211), \
the EMA in the European Union (EU GMP Annex guidelines), and the MHRA in the United Kingdom. \
International harmonisation is driven by the ICH (International Council for Harmonisation), \
particularly ICH Q10, which defines the Pharmaceutical Quality System framework and underpins \
how modern GMP is interpreted globally.

The core pillars of GMP are: qualified and trained personnel; premises and equipment that are \
fit for purpose and properly maintained; well-written and controlled procedures (SOPs); thorough \
contemporaneous documentation; rigorous quality control testing; validated processes and cleaning \
methods; and robust change control to manage modifications. Together, these pillars create a \
system where every batch produced is demonstrably safe, effective, and of consistent quality — \
and where any failure can be identified, investigated, and corrected.\
""",

    "gmp-documentation": """\
GMP's most important principle is often quoted as: "If it wasn't written down, it didn't happen." \
This is not a philosophical stance — it is a regulatory one. In a GMP environment, any action \
that cannot be demonstrated through documentation is treated as though it did not occur. \
Documentation serves two essential purposes: it proves that processes were followed correctly \
at the time, and it provides the traceability needed to investigate failures and protect patients \
if something goes wrong.

The main document types in a GMP operation include: Batch Manufacturing Records (BMRs), which \
capture every step, measurement, and check performed during production of a specific batch; \
Standard Operating Procedures (SOPs), which define precisely how tasks must be carried out; \
equipment logbooks; deviation and out-of-specification (OOS) reports; change control records; \
and qualification and validation documentation. Each type serves a specific function within \
the quality system. Regulators expect to see all of these during inspections, and gaps are \
treated as critical findings.

The gold standard for data quality in GMP records is the ALCOA+ framework. Data must be: \
Attributable (you can tell who did what and when), Legible (readable now and in the future), \
Contemporaneous (recorded at the moment the action was taken, not reconstructed later), \
Original (the first recorded observation), and Accurate. The "+" extends this to: Complete, \
Consistent, Enduring, and Available. When an error is made in a paper GMP record, the correct \
procedure is a single line through the error, leaving the original text readable, with the \
author's initials and the date of correction beside it. Using correction fluid, overwriting, \
or obscuring entries are serious data integrity violations.\
""",

    "gmp-contamination-control": """\
Contamination in pharmaceutical manufacturing falls into four main categories: physical \
contamination (particles, glass, rubber, fibres), chemical contamination (cleaning agents, \
lubricants, cross-contamination from other products), microbiological contamination (bacteria, \
mould, endotoxins), and cross-contamination from other active ingredients. Each presents a \
distinct risk to patient safety, and GMP requires specific controls for all of them. Cross-contamination \
is of particular concern in multi-product facilities, where highly potent or sensitising compounds \
can render an entire batch of another product unsafe if transfer occurs.

Facility and environmental design are the first line of defence. Clean rooms are classified \
by their permitted particle counts: EU GMP Grades A, B, C, and D (equivalent to ISO Classes 5, \
7, and 8) define increasingly stringent environments for sterile manufacturing. Pressure differentials \
between areas prevent airflow from lower-grade to higher-grade zones. HVAC systems must maintain \
defined temperature, humidity, and air change rates, and environmental monitoring programmes \
continuously sample viable (microbiological) and non-viable (particle) contamination. HEPA \
filtration, unidirectional airflow in Grade A zones, and surface finishes that can withstand \
repeated sanitisation are all essential design features.

Personnel are the most significant contamination source in a GMP environment. Humans shed skin \
cells, hair, and microorganisms continuously. Gowning requirements — which become increasingly \
stringent as grade increases, reaching full sterile gowns with hoods, goggles, two pairs of \
gloves, and overshoes for Grade A/B areas — create a physical barrier between the person and \
the product. Cleaning validation is a formal programme that demonstrates a cleaning process \
can consistently remove product residues, cleaning agents, and microbiological contamination \
to defined acceptable limits, and is a requirement before any shared equipment or facility \
can be used for a different product.\
""",

    "gmp-equipment-facilities": """\
GMP requires that all equipment used in manufacturing is qualified before use and maintained \
in a qualified state throughout its operational life. The qualification lifecycle has four stages: \
Design Qualification (DQ) — documenting that the proposed design meets the user's requirements; \
Installation Qualification (IQ) — verifying that the equipment is installed correctly per the \
manufacturer's specification; Operational Qualification (OQ) — demonstrating that it operates \
within defined parameters under all anticipated conditions; and Performance Qualification (PQ) — \
confirming it consistently performs as intended under real production conditions. No equipment \
should be used in GMP manufacturing until IQ and OQ (at minimum) are complete, and PQ is \
required before routine batch production.

Calibration ensures that measurement instruments — balances, thermometers, pressure gauges, \
flow meters — are accurate and traceable to national or international standards. GMP requires \
calibration programmes with defined intervals, and any instrument found to be out of calibration \
must trigger a formal investigation: all results obtained with that instrument since its last \
successful calibration are potentially compromised and must be assessed. Change control is the \
formal process through which any modification to qualified equipment, facilities, utilities, \
or systems is assessed, approved, documented, and re-qualified before the change is implemented \
in production. It exists to ensure that changes do not inadvertently introduce new risks.

GMP facility design follows several key principles: segregation of operations to prevent \
mix-up and cross-contamination (separate areas for different products, different stages, \
quarantine versus released materials); unidirectional material and personnel flows to reduce \
contamination risk; surfaces (floors, walls, ceilings) that are smooth, impermeable, and \
cleanable; adequate drainage without backflow risk; and qualified utilities including Purified \
Water, Water for Injection, compressed air, and clean steam, each of which has its own \
specification and monitoring programme.\
""",

    "gmp-audits-compliance": """\
GMP audits exist to verify that a manufacturing operation is complying with applicable regulations \
and its own procedures. There are three main types: internal audits (also called self-inspections), \
which a company conducts on itself on a regular schedule to identify gaps before regulators do; \
supplier or vendor audits, which assess the GMP compliance of contract manufacturers, API suppliers, \
or other third parties in the supply chain; and regulatory inspections, conducted by authorities \
such as the FDA, MHRA, or EMA. Regulatory inspections may be routine, triggered by a specific \
concern, or conducted as part of a marketing authorisation application review. Findings are \
classified by severity — typically critical (direct patient risk), major (significant but not \
immediately critical), and minor (observation-level).

When something goes wrong in a GMP operation, it generates a deviation — a departure from an \
approved procedure or specification. Deviations must be formally reported, classified by impact, \
investigated for root cause, and closed through a Corrective and Preventive Action (CAPA) plan. \
The CAPA distinguishes between corrective actions (fixing the current problem) and preventive \
actions (changing systems to prevent recurrence). Root cause analysis — identifying the true \
underlying cause rather than the immediate symptom — is the critical step that determines \
whether the CAPA will be effective. A weak root cause investigation leads to a CAPA that \
addresses symptoms and allows the problem to recur.

Serious regulatory findings lead to formal written responses from the manufacturer, and depending \
on severity, to Warning Letters (FDA), GMP non-compliance statements (EMA), or import alerts that \
prevent products from entering a market. Manufacturing licences can be suspended. Products can \
be recalled. Behind all of this is the concept of "quality culture" — the attitudes, behaviours, \
and leadership that determine whether GMP is genuinely lived or merely documented. A strong quality \
culture means people raise concerns, deviations are investigated honestly, and systemic problems \
are fixed rather than papered over. Regulators increasingly assess quality culture directly during \
inspections.\
""",

    # ── Security+ Readiness ─────────────────────────────────────────────────

    "secplus-threats-vulnerabilities": """\
A threat is any potential event or actor that could cause harm to a system; a vulnerability is \
a weakness that a threat can exploit; and a risk is the likelihood and impact of a threat \
successfully exploiting a vulnerability. These three concepts are foundational to Security+ and \
to real-world security work. Understanding the taxonomy of threats — who the adversaries are, \
what they want, and how they operate — is the starting point for building effective defences. \
Threat actors range from script kiddies using off-the-shelf tools to nation-state APTs (Advanced \
Persistent Threats) with substantial resources and long-term objectives.

Attack types covered in Security+ include: malware (viruses, worms, Trojans, ransomware, spyware, \
rootkits, keyloggers — each with distinct propagation and payload behaviours); social engineering \
attacks (phishing, spear phishing, vishing, smishing, pretexting, tailgating); and technical \
exploitation techniques including SQL injection, buffer overflows, cross-site scripting (XSS), \
privilege escalation, and man-in-the-middle attacks. Phishing remains the leading initial access \
vector for enterprise breaches because it targets humans, not technology — and humans are harder \
to patch than software.

Vulnerability management is the ongoing process of identifying, classifying, prioritising, \
remediating, and verifying vulnerabilities in systems and applications. Key concepts include: \
CVE (Common Vulnerabilities and Exposures) identifiers that give vulnerabilities a standard \
reference; CVSS (Common Vulnerability Scoring System) scores that rate severity from 0–10; \
zero-day vulnerabilities, which are unknown to the vendor and have no available patch; and the \
distinction between vulnerability scanning (finding weaknesses) and penetration testing \
(actively exploiting them to assess real-world impact). Defenders must understand attackers' \
tools and techniques — including the MITRE ATT&CK framework, which catalogues real adversary \
tactics and techniques — to build meaningful detection and response capabilities.\
""",

    "secplus-network-security": """\
Network security is the practice of protecting the infrastructure — physical, logical, and \
procedural — that data travels across. Security+ focuses on both the architectural controls \
that prevent attackers from reaching systems and the monitoring capabilities that detect \
when they do. The most fundamental architectural concept is network segmentation: dividing \
a network into zones with controlled communication between them, so that a compromise in \
one zone does not automatically spread to all others. The DMZ (demilitarised zone) is the \
classic example — a network segment for public-facing services (web servers, mail servers) \
that sits between the internet and the internal network.

Firewalls are the primary enforcement point for network segmentation. Packet-filtering firewalls \
inspect individual packets against rules; stateful firewalls track connection state and can \
make more intelligent decisions; next-generation firewalls (NGFWs) add application awareness, \
intrusion prevention, and deep packet inspection. VPNs (Virtual Private Networks) extend \
private network access over public infrastructure using encryption. Network Access Control (NAC) \
systems enforce policies on what devices can connect — checking patch level, certificate validity, \
or endpoint security posture before granting access. IDS/IPS systems (Intrusion Detection/Prevention \
Systems) monitor traffic for known attack signatures or anomalous behaviour.

Common network attacks include: port scanning and enumeration (reconnaissance); ARP poisoning \
and MAC flooding (attacks against Layer 2 switching); DNS poisoning (redirecting legitimate \
queries to malicious destinations); VLAN hopping (escaping network segmentation through switch \
misconfiguration); and distributed denial-of-service (DDoS), which overwhelms services with \
traffic. Wireless networks introduce additional attack surfaces: WEP is cryptographically broken \
and should never be used; WPA2 with strong passphrases is the minimum acceptable standard for \
most environments; WPA3 provides improved protection against offline password attacks. Rogue \
access points and evil twin attacks — where an attacker creates a WiFi network that mimics a \
legitimate one — are persistent threats in public and corporate environments.\
""",

    "secplus-iam": """\
Identity and Access Management (IAM) is the discipline of ensuring that the right people have \
access to the right resources at the right times, and that this can be proven and audited. \
Security+ treats IAM as one of the most critical domains because identity is now the primary \
attack surface in most enterprise breaches: once an attacker has valid credentials, many technical \
controls become irrelevant. The core principle underpinning IAM is least privilege — every account, \
service, and process should have exactly the permissions it needs to do its job, and no more. \
Related concepts include need-to-know (access to information should be granted only when there is \
a legitimate operational requirement) and separation of duties (no single person should control \
an entire sensitive process).

Authentication factors are categorised as: something you know (password, PIN), something you have \
(hardware token, smart card, authenticator app), and something you are (biometric — fingerprint, \
face, retina). Multi-factor authentication (MFA) requires two or more categories and dramatically \
reduces the risk of credential-based attacks. Single Sign-On (SSO) allows users to authenticate \
once and access multiple systems, reducing password fatigue while centralising authentication. \
Federated identity extends SSO across organisational boundaries using standards like SAML, \
OAuth 2.0, and OpenID Connect. Privileged Access Management (PAM) applies additional controls \
to highly privileged accounts — administrator and service accounts — including just-in-time access, \
session recording, and vault-based credential storage.

Access control models determine how authorisation decisions are made. Mandatory Access Control \
(MAC) uses labels (Top Secret, Secret, etc.) set by the system — used primarily in government \
and military contexts. Discretionary Access Control (DAC) lets resource owners grant permissions — \
used in most operating systems. Role-Based Access Control (RBAC) assigns permissions to roles \
rather than individuals, making large-scale management practical. Attribute-Based Access Control \
(ABAC) makes decisions based on attributes of the user, resource, and environment. The account \
lifecycle — provisioning, modification, and especially timely deprovisioning — is a critical \
control area: orphaned accounts from employees who have left represent a significant attack surface.\
""",

    "secplus-cryptography": """\
Cryptography is the practice of securing information by transforming it into a form that only \
authorised parties can read or verify. Security+ focuses on the practical application of \
cryptographic concepts rather than the mathematics underneath them. The two fundamental \
categories are: symmetric encryption, where the same key is used to encrypt and decrypt \
(fast, suitable for bulk data — examples: AES, 3DES, ChaCha20); and asymmetric encryption, \
which uses a mathematically linked key pair — a public key to encrypt (or verify) and a \
private key to decrypt (or sign). Asymmetric encryption is slower but solves the key distribution \
problem: you can freely share your public key without compromising your private key. RSA and \
ECC (Elliptic Curve Cryptography) are the primary asymmetric algorithms in use.

Hashing is a one-way function that produces a fixed-length output (digest) from any input. \
Unlike encryption, hashing cannot be reversed — the same input always produces the same hash, \
and any change to the input produces a completely different hash. Hashing is used to verify \
integrity (file checksums, password storage) and in digital signatures. Common algorithms include \
SHA-256 and SHA-3; MD5 and SHA-1 are cryptographically broken and should not be used for security \
purposes. Digital signatures combine hashing and asymmetric cryptography: a sender hashes a \
message and encrypts the hash with their private key. The recipient decrypts the hash with the \
sender's public key and verifies it matches the message — proving both integrity and authentication.

PKI (Public Key Infrastructure) is the framework of policies, processes, and technology used to \
create, manage, distribute, and revoke digital certificates. A digital certificate binds a public \
key to an identity, and is signed by a Certificate Authority (CA) that vouches for that binding. \
TLS (Transport Layer Security) — the protocol underlying HTTPS — uses PKI to establish encrypted \
connections and authenticate servers. Certificate revocation (via CRL or OCSP) handles the case \
where a certificate is compromised before its expiry. Key concepts for Security+ include: \
certificate chains, root CAs, intermediate CAs, the difference between DV/OV/EV certificates, \
and common TLS attack vectors including downgrade attacks and certificate pinning bypass.\
""",

    "secplus-incident-response": """\
Incident response (IR) is the structured process an organisation follows when a security event \
occurs. Security+ maps IR to a defined lifecycle: Preparation (building the capability before \
incidents happen — policies, playbooks, tools, trained teams); Identification (detecting and \
confirming that an incident has occurred and scoping its extent); Containment (limiting the \
damage — isolating affected systems, blocking attacker access, preserving evidence); Eradication \
(removing the threat — eliminating malware, closing vulnerabilities, disabling compromised \
accounts); Recovery (restoring systems to normal operation and verifying they are clean); and \
Lessons Learned (post-incident review to identify what can be improved in detection, response, \
and prevention). This lifecycle is sometimes abbreviated as PICERL.

The distinction between an event and an incident matters: a security event is any observable \
occurrence in a system (a login, a failed authentication, a network connection); a security \
incident is an event or series of events that has or threatens to have a significant adverse \
impact on the organisation. Not every alert is an incident, and triage — the process of \
classifying and prioritising alerts — is a core IR skill. Digital forensics is the discipline \
of collecting, preserving, and analysing digital evidence in a way that maintains its integrity \
and admissibility. Chain of custody documentation tracks who has handled evidence and when; \
order of volatility dictates that the most transient evidence (RAM, running processes, network \
connections) must be captured before less volatile evidence (disk images, logs).

Business Continuity (BC) and Disaster Recovery (DR) are closely related to IR but focus on \
maintaining and restoring operations rather than the security investigation itself. Key metrics \
include: RPO (Recovery Point Objective — the maximum acceptable data loss, measured in time), \
and RTO (Recovery Time Objective — how quickly systems must be restored). Tabletop exercises \
test IR plans without deploying real resources; simulations and red team exercises provide more \
realistic testing. A mature IR capability also includes threat hunting — proactively searching \
for attackers who have not yet triggered automated detection — and threat intelligence, which \
provides context about adversary tools, techniques, and targets to improve detection and \
prioritisation.\
""",

    # ── Email Security Essentials ───────────────────────────────────────────

    "email-phishing-recognition": """\
Phishing is the use of deceptive email (or other message) to trick recipients into revealing \
credentials, transferring money, or installing malware. It remains the most common initial \
access vector for enterprise breaches, not because it is technically sophisticated, but because \
it targets people — and people can be socially engineered in ways that firewalls and antivirus \
cannot easily prevent. Standard phishing casts a wide net with generic lures (fake bank alerts, \
parcel delivery notifications, account suspension warnings). Spear phishing is targeted: the \
attacker researches the target and crafts a message that references real colleagues, projects, \
or contexts to increase credibility. Whaling targets senior executives specifically, often using \
highly customised pretexts involving board matters, legal issues, or financial transactions.

The indicators of a phishing email fall into several categories. Sender indicators include: \
the display name showing a trusted organisation while the actual email address does not match; \
subtle domain spoofing (micros0ft.com, paypa1.com, company-helpdesk.net); look-alike domains \
registered by attackers specifically for the campaign; and compromised legitimate accounts, \
which are harder to detect because the domain is genuine. Content indicators include: urgency \
or threat language ("your account will be suspended in 24 hours"), requests for sensitive \
information (legitimate organisations do not ask for passwords by email), generic greetings \
rather than personalised ones, and grammatical or formatting anomalies — though sophisticated \
attacks increasingly look professional. Technical indicators include: mismatched or suspicious \
URLs visible on hover, unexpected attachments (especially .zip, .exe, .doc with macros), and \
a discrepancy between the link text shown and the actual URL destination.

The appropriate response to a suspected phishing email is not to forward it, not to click \
anything to "check if it's safe," and not to reply. Report it to your security team through \
the designated reporting mechanism (a report button in the email client, or the security team's \
email address) and delete it. If you have already clicked a link or entered credentials, report \
it immediately — rapid containment significantly reduces the impact of a successful phish. \
Many organisations run internal phishing simulations to test awareness; clicking a simulation \
link is a training opportunity, not a punishable offence, but it should prompt you to reflect \
on what indicator you missed.\
""",

    "email-authentication-protocols": """\
Email was designed in an era when trust was assumed, not verified. As a result, the basic \
protocol (SMTP) has no built-in mechanism to prevent a sender from claiming to be anyone they \
like in the "From" field. The three email authentication protocols — SPF, DKIM, and DMARC — \
were developed to address this, and together they form the foundation of modern email security. \
Understanding how they work and how they interact is essential for anyone in a technical or \
security role.

SPF (Sender Policy Framework) works at the IP level. A domain's DNS record lists the IP \
addresses and hostnames that are authorised to send email for that domain. When a receiving \
mail server gets a message claiming to be from your domain, it checks whether the sending \
IP appears in your SPF record. If it does not, the message fails SPF. The "~all" (softfail) \
and "-all" (hardfail) qualifiers at the end of an SPF record control what happens to messages \
that fail: softfail typically still delivers but marks the message; hardfail recommends rejection. \
SPF has a limitation: it only checks the "envelope from" address (used in the SMTP conversation), \
not the "header from" address (what users see), and it breaks when email is forwarded. DKIM \
(DomainKeys Identified Mail) works at the message level. The sending server signs the message \
with a private key; the public key is published in DNS. The receiving server retrieves the \
public key and verifies the signature, confirming that the message was not altered in transit \
and was sent by a server in control of the private key.

DMARC (Domain-based Message Authentication, Reporting and Conformance) ties SPF and DKIM \
together and adds policy and reporting. A DMARC record specifies what receiving servers should \
do when a message fails both SPF and DKIM alignment, and requests that they send aggregate and \
forensic reports back to the domain owner. Alignment means the "header from" domain must match \
the domain that passed SPF or DKIM — this is the step that prevents attackers from passing SPF \
on their own domain while spoofing your domain in the header From address. DMARC policies are \
p=none (monitor only — no action taken on failures), p=quarantine (send failures to spam), \
and p=reject (refuse delivery of failures). Organisations should move to p=reject only after \
ensuring all legitimate senders are covered by SPF and DKIM, guided by the aggregate reports.\
""",

    "email-bec-attacks": """\
Business Email Compromise (BEC) is a category of fraud in which attackers impersonate trusted \
individuals — typically executives, finance team members, lawyers, or suppliers — to authorise \
fraudulent wire transfers, redirect payroll deposits, or steal sensitive data. The FBI consistently \
ranks BEC among the highest-value cybercrime categories by financial loss, with billions of \
dollars stolen annually. What makes BEC particularly dangerous is that it typically involves \
no malware and no malicious links: the attack is entirely social, relying on impersonation, \
urgency, and authority — which means most technical email security controls offer limited \
protection against it.

BEC attacks follow a recognisable pattern. The attacker conducts reconnaissance — gathering \
information about the organisation's structure, key personnel, finance processes, and supplier \
relationships — often from public sources (LinkedIn, company websites, press releases) and \
sometimes from a prior phishing attack that gave them access to real email conversations. They \
then craft a targeted message that fits naturally into a plausible business context: the CFO \
needs an urgent wire transfer before the close of business; a supplier has changed their bank \
details; legal counsel is handling a confidential acquisition and needs silence. The message \
frequently includes pressure elements: urgency, authority, and requests for secrecy ("please \
don't discuss this with anyone until it's done"). These elements are red flags, not reassurances. \
The most dangerous BEC variant is account takeover — where the attacker has actually compromised \
a legitimate employee's email account and sends messages that appear in all technical respects \
to be genuine.

The most effective defence against BEC is out-of-band verification: when an email requests a \
financial transaction, a change to payment details, or any unusual action, verify the request \
by calling the requester on a known, previously-used phone number — not a number provided in \
the email. Dual authorisation for payments above a threshold prevents any single person from \
being socially engineered into completing a transaction alone. Organisations should also have \
explicit written policies stating that payment details will never be changed by email alone, \
and that executives will never instruct staff to make secret urgent transfers. When BEC is \
suspected, report it immediately to both your security team and your bank — financial institutions \
can sometimes recall wire transfers if contacted quickly.\
""",

    "email-safe-habits": """\
Most email security incidents occur not because of sophisticated technical attacks, but because \
of everyday habits that create unnecessary risk. Safe email habits are the complement to technical \
controls: no filter catches everything, and the decisions you make when you open your inbox \
determine whether you are a line of defence or a point of failure. The habits that matter are \
not complicated — they require consistency and scepticism, applied to the interactions that feel \
most routine.

The most important everyday habits are: verify before you trust (unexpected emails asking for \
action — especially involving money, credentials, or sensitive information — should be verified \
through a separate channel before you act); hover before you click (check where links actually \
go before clicking, and be suspicious of URLs that don't match the claimed sender's domain or \
that use URL shorteners); treat attachments as suspicious by default (legitimate senders rarely \
send unexpected attachments, and Office documents that prompt you to enable macros should be \
treated as malware); use your email client's reporting mechanism rather than replying to spam \
or phishing (replying confirms your address is active); and keep your email client and operating \
system patched (many email-borne attacks exploit software vulnerabilities, not just human ones).

Handling sensitive information by email requires additional care. Email is not a secure channel \
by default — messages may be stored on multiple servers, transmitted without encryption between \
providers, forwarded, printed, or screenshotted by recipients. Do not send credentials, confidential \
client data, or sensitive personal information (health data, financial records, national ID numbers) \
by unencrypted email. If your organisation provides secure file transfer or encrypted email \
capabilities, use them for sensitive content. Be aware of auto-complete in email clients — \
it is a common source of misdirected email, where a message intended for an internal colleague \
is sent to an external contact with a similar name. Misdirected email is a genuine data breach \
under GDPR and HIPAA, and must be reported.\
""",

    "email-after-the-click": """\
Despite training and vigilance, people click malicious links and open malicious attachments. \
The question is not whether this ever happens in an organisation — it does — but whether the \
organisation has the controls and culture in place to detect it quickly, contain the damage, \
and respond effectively. Understanding what happens technically after a malicious click helps \
both defenders and general users recognise the signs and act appropriately.

A credential harvesting attack sends the victim to a fake login page that captures their \
username and password. The page may look identical to a legitimate service. The victim may \
be redirected to the real site afterwards so they notice nothing unusual. Signs that your \
credentials may have been harvested include: the page felt slightly slow, the URL was \
unusual, or you received a login notification for an account you didn't just access. If \
you have submitted credentials to a suspicious site, act immediately: change the password \
on the real service, enable MFA if it isn't already enabled, report the incident to your \
security team, and notify them of any other accounts where you use the same password. A \
malware delivery attack — via a malicious attachment or a link to a malware download — \
may result in nothing visible, or may produce error messages, unexpected crashes, or \
changed browser behaviour. Do not restart your machine (which may trigger further malware \
stages or destroy volatile forensic evidence) — disconnect it from the network and report \
to your security team immediately.

The critical rule after any suspected click is: report it, immediately, even if you are \
uncertain and embarrassed. Security teams are trained to handle this without judgement. \
The window between initial compromise and containment is where the difference between \
a contained incident and a full breach is determined. Delayed reporting, whether from \
embarrassment or a mistaken belief that nothing bad happened, gives attackers the time \
they need to establish persistence, exfiltrate data, or move laterally to other systems. \
Speed of reporting is the single most impactful thing a non-technical employee can do \
in response to a security incident.\
""",

    # ── Workplace Harassment Prevention ────────────────────────────────────

    "harassment-what-is-it": """\
Harassment in the workplace is unwanted conduct related to a protected characteristic — \
such as sex, race, age, disability, religion, sexual orientation, or gender reassignment — \
that has the purpose or effect of violating a person's dignity or creating an intimidating, \
hostile, degrading, humiliating, or offensive environment. The definition has two important \
elements: the behaviour must be unwanted by the recipient, and its effect is assessed from \
the recipient's perspective, not the intention of the person responsible. Something does \
not have to be intended as harassment to be harassment — intent is not a defence.

Harassment takes many forms. Sexual harassment includes unwanted sexual advances, requests \
for sexual favours, sexual comments or jokes, displaying sexually explicit material, and \
unwanted physical contact of a sexual nature. It is not limited to harassment by managers \
or colleagues of the opposite sex, and can occur between people of any gender. Non-sexual \
harassment based on other protected characteristics — making derogatory comments about \
someone's race, repeatedly misgendering a colleague, excluding someone because of their \
religion, or making disability jokes — is equally serious under the law. Harassment can \
be a single severe incident or a pattern of repeated lower-level behaviour that accumulates \
over time. Victimisation — treating someone less favourably because they have made a complaint \
or supported a complaint — is unlawful and treated as seriously as the original conduct.

Every employee has both rights and responsibilities in this area. You have the right to \
work in an environment free from harassment, and to raise a concern or make a complaint \
without fear of retaliation. You have the responsibility to treat colleagues with dignity \
and respect, to refrain from conduct that you know or should know is unwanted, and — \
critically — to challenge or report behaviour you witness even when you are not the target. \
Bystanders who stay silent allow harassment to continue and send an implicit message that \
the behaviour is acceptable.\
""",

    "harassment-recognising-behaviour": """\
Recognising harassment is harder than it sounds. Harassing behaviour exists on a spectrum, \
and the lower end of that spectrum — "banter," casual comments, exclusion from social events — \
is often where the pattern begins before escalating. The cumulative effect of repeated \
low-level behaviour can be just as harmful as a single serious incident, and it is often \
harder for the recipient to articulate because each individual incident seems minor in isolation. \
Part of recognising harassment is understanding that the threshold is not "would most people \
find this offensive?" but "did this person find it unwanted and did it affect their dignity or \
working environment?"

Some behaviours that are commonly minimised but can constitute harassment: persistent "jokes" \
about a person's accent, body, background, or beliefs after they have made clear they dislike \
them; deliberately using the wrong name or pronoun for a transgender colleague repeatedly after \
being corrected; excluding someone from team social events or informal communication channels \
along lines that correlate with a protected characteristic; and making comments about a pregnant \
colleague's commitment to her work or plans for return. The context matters: a one-off awkward \
comment is different from a pattern; a private comment overheard by the target is different from \
a public remark; and a comment made in a position of power over the recipient carries different \
weight than the same comment between peers.

Harassment does not require a formal power relationship. Harassment by peers is as unlawful \
as harassment by managers. Harassment can occur in written communication (email, messaging \
platforms, post), over the phone, at work-related social events outside office hours, or through \
third parties (a client or contractor harassing a supplier's employee). The physical location \
does not define the boundary — work-related contexts do. If you are uncertain whether a specific \
behaviour constitutes harassment, a useful question is: would the person responsible be comfortable \
if this interaction were observed by HR, their manager, or described to a tribunal?\
""",

    "harassment-rights-and-responsibilities": """\
Employees have legally protected rights in relation to harassment. The most fundamental is the \
right to a working environment free from harassment and to be treated with dignity and respect. \
If you experience harassment, you have the right to raise an informal concern or make a formal \
complaint through your organisation's grievance procedure without suffering retaliation for doing \
so. If your employer fails to take reasonable steps to prevent harassment or to act on a complaint, \
they may be liable — both for the original harassment and for any subsequent victimisation. In \
serious cases, employees may also have recourse to an employment tribunal or, depending on the \
jurisdiction, regulatory authorities.

Employers have a legal duty of care and, in many jurisdictions, a specific legal obligation to \
take reasonable steps to prevent harassment. This includes having a clear anti-harassment policy, \
providing training, having effective and accessible complaint procedures, investigating complaints \
promptly and fairly, protecting complainants from retaliation, and acting proportionately on \
findings. The "reasonable steps" defence is important: an employer may avoid liability if they \
can demonstrate they took all reasonable steps to prevent the harassment from occurring. An \
employer who has no policy, provides no training, and ignores complaints has no such defence.

Individual employees also have active responsibilities — not just as potential targets or perpetrators, \
but as colleagues and bystanders. You are responsible for your own conduct: ensuring that you do not \
engage in behaviour that could constitute harassment, even informally, and even if you intend it as \
friendly. You are also responsible as a bystander: if you witness harassment, you can intervene \
directly if it is safe to do so, support the person targeted afterwards, or report what you saw to \
a manager or HR even if the target has not made a formal complaint. The culture of an organisation \
is shaped by what everyone tolerates, not just by what HR prohibits.\
""",

    "harassment-how-to-respond": """\
How to respond to harassment depends on your position — whether you are the person targeted, \
a bystander witnessing it, or a manager receiving a complaint. If you are the target, you have \
options and none of them is the "correct" one that fits every situation. You can address it \
directly with the person responsible if you feel safe doing so — clearly stating that the \
behaviour is unwanted and must stop. You can seek support from a trusted colleague, line manager, \
HR representative, or employee assistance programme without yet making a formal complaint. Or you \
can go straight to a formal complaint through your organisation's grievance procedure. You are \
not required to confront the person responsible, and you are not required to manage the situation \
informally before escalating.

Documentation matters — both for the organisation's ability to investigate and for your own \
protection. Keep a contemporaneous record of incidents: dates, times, locations, what was said \
or done, who was present, and how it affected you. Save relevant emails, messages, or other \
written evidence. This record is not required to make a complaint, but it significantly strengthens \
one. Formal complaints are investigated by HR or a designated officer, typically with both parties \
given the opportunity to provide their account, and witnesses interviewed if relevant. Outcomes \
range from informal mediation to formal disciplinary action depending on severity and findings. \
Complainants must be protected from retaliation throughout and after the process.

As a manager receiving a complaint — whether formal or informal — your first obligation is to \
listen carefully and take it seriously. Do not dismiss the concern, express scepticism, or \
immediately take sides. Do not promise confidentiality you cannot keep (investigations typically \
require you to share information on a need-to-know basis). Do not confront the alleged perpetrator \
on the spot. Follow your organisation's procedure: involve HR, ensure the complainant knows what \
will happen next, and document what was reported to you. Managers who handle complaints badly — \
by minimising them, leaking information, or retaliating against the complainant — create additional \
liability for themselves and their organisation.\
""",

    "harassment-building-respect": """\
Preventing harassment is not primarily a legal compliance exercise — it is about deliberately \
building a workplace culture in which dignity, respect, and inclusion are the expected norm rather \
than an aspiration. Culture is shaped by what leaders model, what colleagues tolerate, and what \
systems reinforce or undermine. An organisation with a strong anti-harassment policy but a \
leadership team that makes exclusionary jokes, overlooks complaints from senior staff, or \
promotes people with known behavioural problems sends a clear signal that the policy is \
performative. The gap between the policy on paper and the culture in practice is where \
harassment lives.

Proactive culture-building involves several interconnected elements. Clear expectations, communicated \
consistently and from the top, establish that certain behaviour is simply not acceptable here — \
not just that HR will investigate it. Inclusive practices reduce the conditions in which harassment \
is more likely: when people from minority groups are isolated, excluded from informal networks, \
or denied equitable treatment, the conditions for harassment worsen. Psychological safety — the \
sense that you can raise concerns, disagree with colleagues, and flag problems without fear of \
social or professional consequences — makes bystander intervention more likely and complaint-making \
less costly. Regular training that engages people in realistic scenarios is more effective than \
annual compliance tick-boxes.

Bystander intervention is one of the most powerful tools available to individuals in building \
a respectful culture. Research consistently shows that harassment is less likely to continue \
when bystanders intervene, and that most people want to intervene but are uncertain how to. \
Effective bystander strategies include: directly naming what you observed ("that comment was \
not okay"); redirecting (changing the subject or creating a distraction that breaks the dynamic); \
supporting the person targeted privately afterwards; and reporting what you witnessed even if \
the target does not — particularly when you have more positional safety than they do. Being a \
responsible bystander is not about policing every interaction; it is about choosing not to \
normalise behaviour that harms colleagues.\
""",

    # ── Anti-Bribery & Corruption ───────────────────────────────────────────

    "abc-what-is-bribery": """\
Bribery is the offering, giving, receiving, or soliciting of something of value with the \
intention of improperly influencing a person's actions or decisions, typically in a business \
or official capacity. It is a criminal offence in virtually every jurisdiction, and modern \
anti-bribery laws — particularly the UK Bribery Act 2010 and the US Foreign Corrupt Practices \
Act (FCPA) — have broad reach and serious consequences. The UK Bribery Act is particularly \
far-reaching: it applies to any company that does business in the UK regardless of where the \
company is incorporated, it applies to the conduct of employees and associated persons acting \
on the company's behalf anywhere in the world, and it creates a strict liability corporate \
offence of failure to prevent bribery that requires no proof of knowledge or intent.

The value exchanged does not have to be money. Lavish gifts, hospitality, entertainment, \
jobs for relatives, preferential contracts, and even intangible benefits like public endorsements \
can constitute a bribe if they are given with the intention of improperly influencing a decision. \
The threshold is not about the monetary value of the item — it is about whether a reasonable \
person would conclude that it was given to influence a business decision or government action. \
A gift worth €20 that is given to a procurement official in the context of an ongoing tender \
process is potentially a bribe; an expensive dinner for a longstanding client celebrating a \
contract renewal may not be, depending on the context, the timing, and whether the hospitality \
is proportionate to the business relationship.

Facilitation payments — small informal payments made to government officials to speed up \
routine actions they are legally required to perform anyway (clearing customs, obtaining a \
routine permit) — are illegal under the UK Bribery Act, even though they remain a permitted \
exception under the FCPA in limited circumstances. This distinction matters: UK-connected \
organisations cannot rely on the FCPA exception, and "everyone does it" or "it's just how \
business works here" are not defences. The only defence available to an organisation facing \
a corporate bribery charge under the UK Act is that it had adequate procedures in place to \
prevent bribery — which places a premium on having a genuine, not merely paper, compliance programme.\
""",

    "abc-red-flags": """\
Recognising the situations and relationships that create elevated bribery risk is a practical \
skill that everyone who works with suppliers, customers, officials, or partners needs. Red \
flags do not prove that bribery is occurring or intended — they indicate that a situation \
deserves closer scrutiny, additional approval, or simply that a conversation with your \
compliance team is warranted. The earlier a potential problem is identified, the easier it \
is to manage. Ignoring red flags and proceeding regardless is itself a compliance failure.

Third-party red flags are among the most important. A supplier, agent, or business partner \
who requests unusually high commissions for vague "facilitation" services; who asks to be \
paid in cash or through a third-country account; who cannot explain their services clearly; \
who has family or political connections to the government officials relevant to a contract; \
or who has a known or rumoured history of improper payments should trigger enhanced due diligence \
before any engagement. Many significant bribery cases have involved improper payments made \
through third parties — distributors, local agents, consultants — with the company claiming \
it did not know what was happening. Courts and regulators increasingly hold this defence to \
a high standard.

Situational red flags include: requests that a payment, gift, or favour be made outside normal \
channels or not recorded in the books; pressure from a client, customer, or official to provide \
something "off the books" or informally; unusual or unexplained urgency around a transaction \
where a government decision is pending; requests for personal benefits (a job for a relative, \
a ticket to a sporting event, a consulting contract for a family member) from someone with \
decision-making authority over a contract your organisation wants; and markets or business \
activities that are consistently identified in corruption risk indexes (such as Transparency \
International's Corruption Perceptions Index) as high-risk. Risk does not mean prohibited — \
it means additional scrutiny, senior approval, and enhanced documentation are required.\
""",

    "abc-money-laundering": """\
Money laundering is the process of making the proceeds of criminal activity appear to be \
legitimate funds. It involves three stages: placement (introducing illegal cash or assets \
into the financial system, often through cash-intensive businesses, smurfing — breaking \
large amounts into small deposits — or purchasing assets); layering (moving the funds through \
multiple transactions, accounts, jurisdictions, and instruments to obscure their origin — \
wire transfers, currency conversion, shell companies, cryptocurrency); and integration \
(the laundered funds re-enter the economy as apparently legitimate assets — property, \
investments, luxury goods — which the criminal can now use openly). Understanding these \
stages helps identify when a business relationship or transaction may be part of a \
laundering scheme.

Businesses have legal obligations under anti-money laundering (AML) regulations, which vary \
by jurisdiction but commonly include: Customer Due Diligence (CDD) — verifying the identity \
of customers and, in higher-risk situations, beneficial owners (Enhanced Due Diligence, or EDD); \
ongoing monitoring of business relationships for transactions inconsistent with the customer's \
profile; reporting suspicious activity to the relevant financial intelligence unit (the NCA's \
UKFIU in the UK, FinCEN in the US); and maintaining records of transactions and due diligence \
for defined periods. In many regulated sectors, designated individuals (Money Laundering \
Reporting Officers, MLROs) have specific statutory responsibilities for AML compliance.

Suspicious activity indicators relevant to businesses outside the financial sector include: \
customers who are unusually reluctant to provide information about their business or the purpose \
of a transaction; payments from unexpected third parties or through unusual routes (a customer \
who asks you to invoice someone else); transactions that appear commercially irrational — \
paying significantly above market rate, or purchasing and quickly reselling at a loss; cash \
payments for large transactions in contexts where this is unusual; and business structures \
or corporate arrangements that seem designed to obscure who the ultimate beneficial owner is. \
Tipping off — informing a customer that they are under suspicion or that a suspicious activity \
report has been filed — is itself a serious criminal offence under AML legislation.\
""",

    "abc-your-obligations": """\
Anti-bribery compliance is not only the responsibility of the legal or compliance team — it \
applies to every employee and is a condition of employment at any organisation with a \
serious compliance programme. Your personal obligations fall into four main areas: knowing \
the rules, managing your own conduct, using the systems your organisation has put in place, \
and raising concerns when you encounter situations that may involve bribery or corruption.

Knowing the rules means understanding what is and is not permitted in your specific role. \
Gifts and hospitality policies typically set monetary thresholds for what can be accepted \
or given without approval (commonly £50–100 for gifts, with more flexibility for hospitality), \
require that these are recorded in a gifts and hospitality register, prohibit cash gifts in \
any direction, and apply stricter rules around government officials. Expenses policies prohibit \
creating slush funds or fictitious expense claims that could be used for improper payments. \
Procurement policies require competitive tendering and prohibit relationships with suppliers \
where there is an undisclosed conflict of interest. You are responsible for knowing what \
your organisation's policies say and following them, even when a counterparty's expectations \
or local custom suggests otherwise.

Using the systems available to you means: getting transactions approved through the right \
channels (not bypassing authorisations because they feel bureaucratic); recording accurately \
in the books and records (expense claims, hospitality registers, invoices); conducting due \
diligence on third parties before engaging them; and escalating to your manager or the \
compliance team when you encounter a situation that doesn't fit cleanly within the rules. \
Raising concerns means using your organisation's speak-up or whistleblowing channel to report \
suspected bribery — whether your own concerns or something you have witnessed. Retaliation \
against whistleblowers is prohibited by law in most jurisdictions, and most serious bribery \
investigations begin with an internal report from an employee who saw something and spoke up.\
""",

    "abc-real-world-scenarios": """\
Abstract principles of anti-bribery compliance become significantly clearer — and significantly \
harder — when applied to real situations. The difficulty is rarely that someone is explicitly \
offered a briefcase of cash; it is that situations arise in grey areas, where the right answer \
requires judgement, context, and sometimes the courage to decline something that everyone around \
you seems to accept as normal. Scenario-based reasoning is how you develop the judgement to \
navigate these situations correctly.

Consider how the same action can be acceptable in one context and a bribe in another. Paying \
for a client dinner as part of building a long-term business relationship, where the hospitality \
is proportionate to the relationship and consistent with your organisation's policy, is legitimate. \
The same dinner, given to the procurement official of a company that is currently reviewing \
your bid, where the value is above your policy threshold and the event is not disclosed or \
approved, is a bribe or at minimum a serious compliance risk. The questions you should be \
asking: Is this reasonable and proportionate? Is it transparent — would I be comfortable if \
my CEO, my legal team, and the FT's front page could all see this? Is it recorded properly? \
Is it approved? Is there a government official involved, which requires extra caution?

The hardest scenarios involve pressure from a client, a market where "everyone does it," or \
a genuine belief that a payment is the only way to get something done. In these situations, \
the organisation's obligation — and your personal obligation — is to refuse and to escalate, \
not to rationalise. "Everyone does it here" has not historically been a successful defence \
in court or before a regulator. The existence of local custom or commercial pressure does not \
change the legal position. What it means in practice is that some contracts cannot ethically \
or legally be won in some markets — and declining them is the correct business decision, even \
when it is a costly one.\
""",

    # ── Data Privacy & GDPR ─────────────────────────────────────────────────

    "gdpr-what-is-personal-data": """\
Personal data, under GDPR, is any information relating to an identified or identifiable natural \
person — the "data subject." A person is identifiable if they can be identified directly or \
indirectly, by reference to an identifier such as a name, an ID number, location data, an online \
identifier, or one or more factors specific to their physical, physiological, genetic, mental, \
economic, cultural, or social identity. The key word is "or" — a person does not need to be \
directly named for information about them to be personal data. A dataset containing no names \
but combining postcode, date of birth, and job title may still be personal data if someone \
could use that combination to identify a specific individual, even with some additional effort.

GDPR draws a distinction between ordinary personal data and special categories of personal data, \
which are accorded stronger protection because of their particular sensitivity. The special \
categories under Article 9 are: racial or ethnic origin, political opinions, religious or \
philosophical beliefs, trade union membership, genetic data, biometric data processed for the \
purpose of uniquely identifying a person, health data, data concerning sex life, and data \
concerning sexual orientation. Processing special category data is prohibited unless one of \
a specific set of conditions applies — including explicit consent from the data subject, \
necessity for employment law purposes, vital interests, or scientific research with appropriate \
safeguards. Criminal offence data is similarly restricted under Article 10.

Pseudonymisation replaces directly identifying information with a reference code, but if the \
key linking the code to the individual is retained anywhere, the data remains personal data — \
because re-identification is possible with the key. True anonymisation removes all reasonable \
means of re-identification, including through combination with other datasets, and data that \
is genuinely anonymous falls outside the scope of GDPR entirely. The distinction matters \
practically: pseudonymised data still requires legal basis, appropriate security, and compliance \
with data subject rights; anonymised data does not. Achieving genuine anonymisation is harder \
than it appears — researchers have repeatedly demonstrated re-identification of supposedly \
anonymous datasets using publicly available information.\
""",

    "gdpr-principles": """\
Article 5 of GDPR sets out six data protection principles that govern every processing activity \
involving personal data. These are not aspirational guidelines — they are legal obligations, \
and the organisation responsible for processing (the controller) must be able to demonstrate \
compliance with all of them at any time. Article 5(2) adds an overarching accountability \
principle that makes this a proactive obligation: compliance must be actively evidenced, \
not merely claimed.

The six principles are: Lawfulness, fairness, and transparency — processing must have a valid \
legal basis, must not be deceptive or harmful, and data subjects must be informed about how \
their data is used. Purpose limitation — data collected for a specified purpose must not be \
further processed in ways incompatible with that purpose. Data minimisation — only data that \
is adequate, relevant, and limited to what is necessary for the purpose should be collected; \
collecting data "just in case" violates this principle. Accuracy — data must be kept accurate \
and up to date, with inaccurate data erased or corrected promptly. Storage limitation — data \
must not be kept longer than is necessary for the purpose; retention periods should be defined, \
documented, and enforced. Integrity and confidentiality (security) — appropriate technical and \
organisational measures must protect data against unauthorised or unlawful processing and against \
accidental loss, destruction, or damage.

The practical implication of these principles is that every new processing activity should be \
designed with them in mind from the outset. Purpose limitation means that when a new use of \
existing data is proposed — using a customer email list for a new marketing campaign, for \
example — the new purpose must be assessed for compatibility with the original purpose. \
Storage limitation means that data must not simply accumulate indefinitely: there must be \
defined retention periods and a mechanism that enforces them. The accountability principle \
means that all of this must be documented — in privacy notices, data protection impact \
assessments, Records of Processing Activities, and training logs — so that the organisation \
can demonstrate compliance rather than simply assert it.\
""",

    "gdpr-individual-rights": """\
GDPR gives individuals (data subjects) a set of enforceable rights over their personal data. \
These rights are not optional features — they are legal entitlements, and organisations must \
have processes in place to respond to them within defined timeframes. Failing to respond \
correctly to a rights request — or ignoring it — can result in regulatory complaints and fines. \
The core rights are: the right of access (to receive a copy of personal data held and information \
about how it is processed); the right to rectification (to have inaccurate data corrected); \
the right to erasure ("the right to be forgotten" — to have data deleted in certain circumstances); \
the right to restriction of processing; the right to data portability (to receive data in a \
machine-readable format); and the right to object (to stop processing in certain circumstances, \
particularly direct marketing).

The right of access — commonly exercised through a Subject Access Request (SAR) — must be \
responded to within one calendar month of receipt, extendable by a further two months in \
complex cases (with notification to the data subject). There is generally no fee for a SAR. \
The response must include: a copy of the personal data; confirmation that data is being processed; \
the purposes of processing; the categories of data; recipients of the data; the retention period; \
and information about other rights. The right to erasure is not absolute — it does not apply \
when processing is necessary for compliance with a legal obligation, the exercise of legal \
claims, archiving in the public interest, or other specified grounds. Organisations should \
therefore conduct a careful assessment rather than automatically erasing data on request.

Requests can be submitted by any means — email, letter, verbally. Organisations cannot insist \
on a specific format. Identity verification is permissible where there is reasonable doubt about \
the requester's identity, but the bar for requesting verification should be proportionate — you \
cannot make it systematically burdensome. Requests that are manifestly unfounded or excessive \
(particularly where they are repetitive) may be refused or charged a reasonable fee, but the \
organisation must be able to demonstrate the basis for this conclusion. The right to object to \
direct marketing is absolute and must be honoured immediately, without any assessment of grounds.\
""",

    "gdpr-data-breaches": """\
A personal data breach is any breach of security that leads to the accidental or unlawful \
destruction, loss, alteration, unauthorised disclosure of, or access to personal data. This \
is broader than most people initially assume: it includes not just malicious external attacks, \
but accidental incidents — a misdirected email, a lost unencrypted USB drive, a file shared \
with the wrong person — as well as internal incidents such as an employee accessing data they \
are not authorised to see, or a system failure that corrupts personal data. The legal obligations \
triggered by a breach depend on the risk level: not every breach requires notification, but \
every breach requires documentation.

When a breach is discovered, the controller must assess its likely risk to individuals' rights \
and freedoms. If the breach is unlikely to result in any risk, it should be documented internally \
but no notification is required. If the breach is likely to result in a risk, it must be reported \
to the relevant supervisory authority (in the UK, the ICO) within 72 hours of becoming aware — \
not within 72 hours of the breach itself occurring, but from when the organisation becomes aware. \
Partial notifications are acceptable if not all information is available within 72 hours, provided \
the outstanding information is submitted without further undue delay. If the breach is likely to \
result in a high risk to individuals — their rights, finances, health, safety, or reputation — \
then the affected individuals must also be notified directly, without undue delay.

The content of a supervisory authority notification must include: a description of the nature \
of the breach and the categories and approximate number of individuals and records affected; \
the contact details of the data protection officer or other contact point; the likely consequences \
of the breach; and the measures taken or proposed to address the breach and mitigate its effects. \
Regardless of whether the breach meets the notification threshold, it must be documented in an \
internal breach register. This register serves two purposes: it provides evidence of the \
organisation's awareness and response process, and it enables the supervisory authority to \
assess whether the organisation is systematically identifying and managing breaches correctly.\
""",

    "gdpr-privacy-by-design": """\
Privacy by design is the principle that data protection should be embedded into systems, \
processes, and products from the outset — not added as an afterthought once a system is \
built and deployed. Article 25 of GDPR makes this a legal obligation: controllers must \
implement data protection by design and by default, taking into account the state of the \
art, the cost of implementation, the nature and purposes of processing, and the risks to \
individuals. "By default" means that, without any intervention by the data subject, only \
personal data that is necessary for each specific purpose is processed — the most privacy-protective \
settings should be the default, not an opt-in.

The practical implication is that privacy considerations must be part of the design process \
for any new system, application, or process that handles personal data. This means: limiting \
data collection to what is actually needed (data minimisation at the architecture level); \
applying pseudonymisation or encryption where appropriate from the beginning; designing access \
controls that reflect least-privilege principles; building retention and deletion mechanisms \
into the system rather than leaving them as manual processes; and considering what data would \
be exposed in the event of a breach and designing to limit that exposure. Retrofitting privacy \
controls after a system is built is typically more expensive, less effective, and harder to \
verify than building them in from the start.

Data Protection Impact Assessments (DPIAs) are required under Article 35 whenever processing \
is likely to result in a high risk to individuals — particularly for large-scale processing of \
special category data, systematic and extensive profiling, or large-scale monitoring of publicly \
accessible areas. A DPIA is not simply a form to be completed: it is a structured process of \
identifying the purpose and necessity of the processing, assessing the risks, and identifying \
measures to mitigate them. Where a DPIA concludes that risks cannot be adequately mitigated, \
the organisation must consult the supervisory authority before proceeding. The Data Protection \
Officer (DPO) — mandatory for public authorities, for organisations processing special category \
data at scale, and for those engaged in large-scale systematic monitoring — must be consulted \
in the DPIA process and must be independent, with direct access to senior management and \
protection from retaliation for performing their tasks.\
""",

    # ── HIPAA Awareness ─────────────────────────────────────────────────────

    "hipaa-what-is-hipaa": """\
The Health Insurance Portability and Accountability Act of 1996 (HIPAA) is a US federal law \
that establishes national standards to protect individuals' medical records and other personally \
identifiable health information. It applies to "covered entities" — health plans (insurance \
companies, employer-sponsored health plans, Medicare, Medicaid), healthcare clearinghouses \
(organisations that process health information between non-standard and standard formats), and \
healthcare providers (hospitals, clinics, physicians, pharmacies, nursing homes) that transmit \
health information electronically in connection with covered transactions. HIPAA also applies \
to "business associates" — any organisation that performs functions or activities on behalf of \
a covered entity that involve creating, receiving, maintaining, or transmitting protected health \
information (PHI). Cloud storage providers, billing companies, EHR vendors, and legal firms \
handling patient records are all examples of business associates.

HIPAA has three main rules. The Privacy Rule (45 CFR Part 164, Subpart E) establishes standards \
for how PHI may be used and disclosed, and gives patients rights over their own health information. \
The Security Rule (45 CFR Part 164, Subpart C) applies specifically to electronic PHI (ePHI) and \
requires covered entities and business associates to implement administrative, physical, and \
technical safeguards to ensure its confidentiality, integrity, and availability. The Breach \
Notification Rule (45 CFR Part 164, Subpart D) requires covered entities to notify affected \
individuals, the HHS, and in some cases the media when a breach of unsecured PHI occurs.

Protected Health Information (PHI) is individually identifiable health information that is \
held or transmitted by a covered entity or business associate. It includes any information \
that relates to an individual's past, present, or future physical or mental health condition, \
the provision of healthcare to them, or the payment for that healthcare — and which identifies \
or could identify the individual. HIPAA defines 18 identifiers whose presence in a dataset \
makes it PHI: name, geographic data smaller than state, dates (other than year) related to \
the individual, phone numbers, fax numbers, email addresses, Social Security numbers, medical \
record numbers, health plan beneficiary numbers, account numbers, certificate/licence numbers, \
vehicle identifiers, device identifiers, URLs, IP addresses, biometric identifiers, full-face \
photographs, and any other unique identifying number or code.\
""",

    "hipaa-patient-rights": """\
The HIPAA Privacy Rule grants patients (data subjects) specific, enforceable rights over their \
protected health information. These rights are not merely ethical commitments — they are legal \
entitlements backed by the enforcement authority of the HHS Office for Civil Rights (OCR). \
Covered entities must have processes, designated contacts, and trained staff in place to \
respond to rights requests correctly and within the prescribed timeframes. Failure to honour \
patient rights is a HIPAA violation subject to civil monetary penalties.

The most frequently exercised right is the right of access under 45 CFR §164.524 — commonly \
called a "records request." Patients have the right to inspect and obtain a copy of their PHI \
maintained in a designated record set (typically medical records and billing records). The \
covered entity must provide access within 30 calendar days of receiving the request, extendable \
by a further 30 days with written notice to the patient. The information must be provided in \
the format requested by the patient if readily producible in that format. Fees may be charged \
only for the reasonable costs of copying, postage, and preparation — not as a barrier to access. \
The right to request amendment (§164.526) allows patients to request correction of inaccurate \
or incomplete PHI; the covered entity has 60 days to act, may deny the request on specified \
grounds, and must document any denial and allow the patient to submit a statement of disagreement.

Patients also have the right to an accounting of disclosures (§164.528) — a log of certain \
disclosures the covered entity has made of their PHI without their authorisation, covering \
the prior six years. This does not include disclosures for treatment, payment, or healthcare \
operations, nor disclosures the patient authorised. The Notice of Privacy Practices (NPP) must \
be provided to patients at their first service encounter and describes how the covered entity \
uses and discloses PHI, patient rights, and how to file a complaint. Patients have the right \
to request restrictions on uses and disclosures — the covered entity is generally not required \
to agree, with one important exception: if the patient pays out of pocket in full for a specific \
service, they have an absolute right to request that information about that service not be \
disclosed to their health plan, and the covered entity must agree.\
""",

    "hipaa-minimum-necessary": """\
The minimum necessary standard under 45 CFR §164.502(b) requires that covered entities and \
business associates make reasonable efforts to limit the use, disclosure, and request of PHI \
to the minimum necessary to accomplish the intended purpose. The principle exists because PHI \
is sensitive — unnecessary access to health information violates patient privacy even when no \
further harm results — and because limiting access reduces the attack surface for both accidental \
and malicious disclosure. The standard applies to uses of PHI within the organisation, disclosures \
to third parties, and requests for PHI from other organisations.

There are important exceptions. The minimum necessary standard does not apply to: disclosures \
to or requests by a healthcare provider for treatment purposes (a physician needs full access \
to the relevant record, not a minimum necessary subset); disclosures to the patient themselves; \
disclosures made pursuant to a valid patient authorisation; disclosures required by law; \
and disclosures to HHS for compliance or enforcement purposes. For all other uses and disclosures, \
covered entities must establish policies and procedures that identify the persons or classes of \
persons who need access to PHI to do their jobs, and limit access accordingly. Role-based access \
controls in electronic health record systems — where a billing clerk can see billing records but \
not clinical notes, and a nurse can see the records for patients in their unit but not those on \
another floor — are the practical implementation of the minimum necessary standard.

"Curiosity browsing" — accessing a patient's records without a legitimate clinical, administrative, \
or operational need — is one of the most common HIPAA violations and one of the most commonly \
misunderstood. It does not matter that the information was not shared with anyone else. It does \
not matter that the patient is a colleague, a family member, or a celebrity whose admission \
has been widely reported. Accessing a record without a work-related need is an impermissible \
use of PHI, and covered entities are required to have audit log capabilities for ePHI precisely \
to detect this. Workforce members who engage in curiosity browsing risk termination and may be \
referred to HHS; covered entities that fail to detect and address it face regulatory action.\
""",

    "hipaa-breach-notification": """\
The HIPAA Breach Notification Rule (45 CFR Part 164, Subpart D) requires covered entities to \
notify affected individuals, the Secretary of HHS, and in some cases the media when a breach \
of unsecured PHI occurs. A breach is defined as an impermissible use or disclosure of PHI that \
compromises the security or privacy of the information. When an impermissible use or disclosure \
occurs, HIPAA establishes a presumption that it is a breach — meaning the covered entity bears \
the burden of demonstrating, through a documented risk assessment, that there is a low probability \
that the PHI has been compromised.

The four-factor risk assessment evaluates: the nature and extent of the PHI involved (types \
of identifiers, likelihood of re-identification); who accessed or could have accessed the PHI \
(an internal employee who saw information by mistake is different from an external attacker); \
whether the PHI was actually acquired or viewed (a misdirected fax to a wrong physician's \
office that was returned unread is different from an email to a journalist); and the extent \
to which the risk has been mitigated (a lost laptop that was encrypted to NIST standards is \
not a breach, because the data was protected). The covered entity must document this assessment \
regardless of its conclusion. If the assessment concludes the probability of compromise is low, \
no notification is required but the incident must still be recorded.

When notification is required, individuals must be notified without unreasonable delay and in \
no case later than 60 calendar days after discovery of the breach. The notification must include: \
a brief description of the breach; the types of PHI involved; steps individuals should take to \
protect themselves; what the covered entity is doing to investigate and mitigate; and contact \
information. The HHS must be notified by the same 60-day deadline; for breaches affecting fewer \
than 500 residents of a state, covered entities may submit an annual log rather than individual \
notifications. When a breach affects 500 or more residents of a state or jurisdiction, the \
media must also be notified. Business associates must notify the covered entity without \
unreasonable delay and within 60 days of discovering a breach affecting the covered entity's PHI.\
""",

    "hipaa-daily-work": """\
Most HIPAA violations in practice are not caused by sophisticated cyberattacks — they are caused \
by workforce members who did not understand the rules, underestimated the consequences of routine \
shortcuts, or assumed that no harm was done because information was not deliberately shared. The \
day-to-day application of HIPAA in healthcare and administrative settings requires ongoing \
attention to how, where, and with whom information is handled — in conversations, in physical \
documents, on screens, and in electronic communications.

Common workplace HIPAA violations include: discussing a patient's condition or treatment in a \
hallway, elevator, or other public area where the conversation can be overheard by people with \
no need to know; leaving patient records or documents visible on desks, on printer trays, or \
on unlocked computer screens; sending PHI via unencrypted personal email or text message rather \
than through authorised communication channels; disposing of documents containing PHI in regular \
recycling bins rather than shredding (or placing them in secure shredding containers); accessing \
the records of a friend, family member, colleague, or celebrity patient out of curiosity rather \
than clinical or operational need; and failing to log out of EHR systems when leaving a workstation \
unattended. Each of these is a HIPAA violation regardless of whether any further harm results.

Disclosures without patient authorisation are permitted for three main purposes — treatment, \
payment, and healthcare operations (collectively "TPO") — and the minimum necessary standard \
applies to payment and operations disclosures but not to treatment disclosures between providers. \
Social media warrants particular care: even seemingly vague descriptions of a patient or their \
situation can constitute a HIPAA violation if a reasonable person could identify the individual \
from the context. When a workforce member witnesses a suspected violation, they are expected to \
report it — to their supervisor, the Privacy Officer, or through a designated reporting mechanism. \
Workforce members who report in good faith are protected from retaliation, and covered entities \
are required to document and investigate reported concerns, apply the sanctions policy to \
confirmed violations, and maintain records of the outcome.\
""",

    # ── DEI Fundamentals ────────────────────────────────────────────────────

    "dei-definitions": """\
Diversity, equity, and inclusion are three distinct concepts that are often grouped together and \
treated as synonyms. They are not — each describes a different dimension of the same goal, and \
confusing them leads to interventions that address the wrong problem. Diversity is about presence: \
the degree to which an organisation reflects difference across demographic, cognitive, and \
experiential dimensions — race, ethnicity, gender, age, disability, sexual orientation, \
socioeconomic background, neurodivergence, professional background, and more. An organisation \
can be demographically diverse while still being deeply inequitable and exclusive. Representation \
is necessary but not sufficient.

Equity is about fairness: ensuring that policies, processes, and resource allocation account \
for the different starting points and systemic disadvantages that people bring to the workplace. \
It is distinct from equality, which gives everyone the same thing regardless of need. Equity \
asks: given that people start from different places, what do they each need to reach the same \
outcomes? This might mean targeted mentorship for groups historically excluded from leadership, \
accessible hiring processes that do not screen out disabled candidates unnecessarily, or \
parental leave policies that support carers equitably regardless of gender. Equity addresses \
structural barriers; equality ignores them.

Inclusion is about experience: whether people can fully participate, contribute, and be heard \
in their workplace — not just whether they are present. An organisation with high diversity but \
low inclusion is one where people from minority groups are hired but not promoted, present in \
meetings but not listened to, represented in headcount but not in decision-making. Belonging \
goes further: it is the felt sense that you are valued as you are, that you do not need to \
mask your identity or code-switch to be accepted, and that the organisation would notice if \
you left. DEI work is only successful when all three dimensions are working together: diversity \
without equity and inclusion is tokenism; equity without inclusion means systemic changes exist \
on paper but people still feel excluded; inclusion without diversity means a homogeneous group \
has a pleasant internal culture that does not reflect the world.\
""",

    "dei-unconscious-bias": """\
Unconscious bias — also called implicit bias — refers to the attitudes, stereotypes, and \
associations that affect our judgements and decisions automatically, without conscious awareness \
or deliberate intention. These biases form through exposure to cultural messages, social \
structures, and lived experience from early childhood, and they operate through cognitive \
shortcuts (heuristics) that allow us to process information quickly. The cognitive mechanism \
is not pathological — it is how all human brains work. The problem is that when these shortcuts \
operate on decisions involving people, they systematically favour some groups over others in \
ways that contradict our stated values and are invisible to us in the moment. Research using \
the Implicit Association Test (IAT) consistently demonstrates that well-intentioned people — \
including those who explicitly endorse egalitarian values — hold implicit biases that affect \
their behaviour.

Common bias types include: affinity bias (favouring people who are similar to ourselves in \
background, interests, or communication style — the "culture fit" instinct that often perpetuates \
homogeneity); confirmation bias (seeking information that confirms existing beliefs about a \
person or group and discounting contradictory evidence); the halo and horn effects (one positive \
trait causing us to rate a person positively across all dimensions, or one negative trait causing \
the reverse); attribution bias (attributing a man's success to his competence and a woman's to \
luck or circumstance, while attributing failure in the opposite direction); and stereotyping \
(applying group-level generalisations to individuals). In hiring, these biases manifest at every \
stage: in how job descriptions are written, in whose CVs are shortlisted, in how interviews are \
conducted and assessed, and in how salary offers are made.

The reason bias awareness training alone does not reliably change outcomes is that awareness of \
a bias does not disable it — the automatic processes that produce biased judgements operate below \
the level of conscious control. What does reduce bias in decisions is structure: standardised \
interview questions asked of all candidates; criteria established and written down before \
reviewing applications; blind review of CVs where names, addresses, and university names are \
removed; diverse interview panels; calibration discussions that surface and examine discrepant \
assessments; and audit of outcomes across demographic groups. Structural interventions change \
the decision-making environment so that bias has less opportunity to operate, rather than \
relying on individuals to consciously override automatic processes in real time.\
""",

    "dei-microaggressions": """\
Microaggressions are brief, everyday exchanges — verbal, behavioural, or environmental — that \
communicate negative, demeaning, or invalidating messages to members of marginalised groups, \
often without conscious intent. The concept was introduced by psychiatrist Chester Pierce in \
the 1970s and further developed by psychologist Derald Wing Sue. Three forms are typically \
distinguished: microinsults, which communicate rudeness or insensitivity based on group \
membership (commenting on a Black colleague's "articulate" speech in a way that implies surprise); \
microinvalidations, which exclude or negate the experiences of marginalised groups (telling a \
person of colour that you "don't see colour," or asking a British-born Asian colleague where \
they are "really" from); and microassaults, which are more conscious and deliberate acts of \
discrimination that an individual might still claim were "just a joke."

The intent of the person delivering a microaggression is legally and practically separate from \
its impact on the recipient. Good intentions do not prevent harm. When someone points out that \
a comment was a microaggression, the most common unhelpful responses are: denial ("I didn't \
mean it like that"), centering the deliverer's feelings ("I feel terrible that you took it \
that way"), or dismissal ("you're being oversensitive"). All of these shift the focus away from \
the impact and onto the deliverer's discomfort with being told they caused harm. The effective \
response is to listen to the impact described, acknowledge it, thank the person for the feedback, \
and consider how to behave differently — without requiring the recipient to perform emotional \
labour to manage the deliverer's reaction.

The cumulative effect of microaggressions is well-documented and is the reason researchers \
use the phrase "death by a thousand cuts" to describe the experience. A single interaction \
that makes you question whether you belong, whether your presence is welcome, or whether \
your identity is seen as lesser might be manageable in isolation. Repeated daily across \
months and years — often with no single incident egregious enough to formally complain about \
— the effect on cognitive load, psychological wellbeing, job engagement, and career trajectory \
is significant. This cumulative effect is why the response "it was just a comment" misses \
the point: the comment is not being assessed in isolation, but as one instance of a pattern \
that the recipient has experienced repeatedly.\
""",

    "dei-inclusive-communication": """\
Inclusive communication is the practice of making deliberate choices — in language, listening, \
and the conditions you create — that enable more people to participate fully and feel genuinely \
heard. It is not primarily about avoiding specific words, though language choices do matter; it \
is about the underlying orientation of treating every person as someone whose perspective is worth \
engaging with seriously, and whose presence in the conversation is valued rather than tolerated. \
Inclusive language avoids terms that carry a history of exclusion or that embed assumptions about \
who is "normal." Gendered defaults (using "he" when the gender of the subject is unknown; \
"guys" as a universal term for a mixed group), ability-based metaphors used as negatives \
("turning a blind eye," "falling on deaf ears"), and terms that reflect historical \
dehumanisation are examples of language choices that can signal exclusion to those they affect.

Person-first language (a person with a disability) and identity-first language (a disabled person) \
reflect different relationships between identity and selfhood. Person-first language was developed \
to counter dehumanising language that reduced people to their diagnoses. Identity-first language \
has been increasingly preferred by some disability communities — particularly Autistic and Deaf \
communities — who regard their characteristic as an integral part of their identity rather than \
something separate from the "person." Neither is universally correct: individual preference \
should be followed whenever possible. When in doubt, ask respectfully. The same applies to \
pronouns: if you do not know a colleague's pronouns, use their name rather than assuming, \
and offer your own pronouns when introducing yourself in contexts where it is relevant.

Psychological safety — the shared belief that one can speak up, ask questions, make mistakes, \
or disagree without fear of punishment or humiliation — is the foundation of genuinely inclusive \
team environments. It was identified by Amy Edmondson's research and subsequently confirmed by \
Google's Project Aristotle as the strongest predictor of team effectiveness. Psychological safety \
is primarily created and destroyed by leaders: how a manager responds to the first person who \
raises a concern, admits a mistake, or disagrees with the room sets the norm for everyone else. \
Listening actively — fully attending to what someone is saying, suspending judgement, asking \
clarifying questions rather than jumping to rebuttal, and acknowledging contributions before \
responding — is both a demonstration of respect and a practical tool for eliciting better \
information and decisions from a group.\
""",

    "dei-allyship": """\
Allyship is the practice of using whatever privilege, position, or resources you hold to \
support people from groups that have less access to power or opportunity than your own. It \
is active, not passive — it requires deliberate choices about when to speak, when to yield, \
and how to use your position in ways that benefit others rather than primarily yourself. \
The distinction between active and performative allyship matters: performative allyship signals \
solidarity when it is socially low-cost (sharing a post, wearing a symbol, making a statement \
at an all-hands meeting) but is absent when it involves real risk — speaking up in a meeting \
when a colleague is dismissed, declining to attend an event that has an exclusionary guest list, \
or providing a reference for someone whose ideas your team has been ignoring. Performative \
allyship can cause harm by giving the impression of support that does not exist when it counts.

Understanding privilege is a prerequisite for effective allyship, not because it requires guilt \
or self-flagellation, but because you cannot leverage an advantage you have not recognised. \
Privilege in this context means having characteristics that are treated as the default or norm \
in a given context — being white in a predominantly white institution, being male in a male-dominated \
industry, being non-disabled in environments designed for non-disabled people — in ways that \
remove friction from your experience that others face. The practical relevance of this for \
allyship is that your relative safety and credibility in a given environment may allow you to \
take risks or make statements that would carry much greater cost for a colleague from a \
marginalised group — and therefore that you have the option and arguably the responsibility \
to act in circumstances where they cannot.

Amplifying voices means actively directing attention and credit to the contributions of \
colleagues from underrepresented groups: restating an idea with attribution when it was \
ignored the first time it was raised; citing colleagues in presentations and documents; \
creating opportunities for them to present their own work rather than having it absorbed \
into someone else's narrative. Sponsorship — actively advocating for someone's advancement \
in conversations where they are not present, using your own reputational capital — has \
substantially greater career impact than mentorship and is more available to people with \
positional power than is often recognised. Sustainable allyship requires not centering your \
own experience, accepting correction without defensiveness when your allyship falls short, \
and pacing the emotional and social labour involved to avoid burnout.\
""",
}


def insert_content(yaml_text: str, slug: str, content: str) -> str:
    """Insert `content: |\\n  <text>` before the `challenge:` line for the given lesson slug."""
    # Find the lesson slug line (6-space indent as list item key)
    slug_pattern = f"      - slug: {slug}\n"
    slug_pos = yaml_text.find(slug_pattern)
    if slug_pos == -1:
        print(f"  WARN: slug not found: {slug}")
        return yaml_text

    # Find the next `        challenge:` after this slug
    challenge_pattern = "        challenge:"
    challenge_pos = yaml_text.find(challenge_pattern, slug_pos)
    if challenge_pos == -1:
        print(f"  WARN: challenge not found for: {slug}")
        return yaml_text

    # Format the content block (10-space indent for body lines)
    indented_lines = []
    for para in content.strip().split("\n\n"):
        for line in para.strip().split("\n"):
            indented_lines.append("          " + line)
        indented_lines.append("")  # blank line between paragraphs

    # Remove trailing blank line
    while indented_lines and indented_lines[-1] == "":
        indented_lines.pop()

    content_block = "        content: |\n" + "\n".join(indented_lines) + "\n"

    return yaml_text[:challenge_pos] + content_block + yaml_text[challenge_pos:]


def main():
    path = "lessons.yaml"
    with open(path) as f:
        text = f.read()

    for slug, content in CONTENT.items():
        print(f"Injecting: {slug}")
        text = insert_content(text, slug, content)

    with open(path, "w") as f:
        f.write(text)

    print(f"\nDone. Injected content for {len(CONTENT)} lessons.")

    # Validate
    import yaml
    with open(path) as f:
        d = yaml.safe_load(f)
    count = sum(
        1 for course in d["courses"]
        for lesson in course["lessons"]
        if "content" in lesson
    )
    print(f"Validation: {count} lessons now have content fields.")


if __name__ == "__main__":
    main()
