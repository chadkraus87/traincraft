# CoachRhythm — Privacy Policy

**DRAFT — NOT FOR USE.**

> **UNREVIEWED AI-ASSISTED DRAFT. NOT LEGAL ADVICE. DO NOT PUBLISH.**
> This policy was prepared with AI assistance and has not been reviewed by a
> licensed attorney. It must be reviewed and approved by a licensed attorney in
> the relevant jurisdiction before publication.
>
> **One statement in this draft is not yet true of the software and must not be
> published until it is:**
> - § 9 describes trainer account deletion. As of this draft, no
>   account-deletion or tenant-purge capability exists in the application.
>   Build it, then publish the section.
>
> **Resolved during drafting:** § 5.2 states that the client's name is not sent
> to our AI provider. That was *not* true when this analysis began — the name
> was transmitted on every generation — and was corrected in commit `57d361c`
> while these documents were being prepared. The statement is now accurate.
> Add a regression assertion to `tests/builder-guard.test.ts` so it stays that
> way.
>
> Statements about our AI provider's retention and training practices (§ 5.2,
> § 6) must be verified in writing against that vendor's current terms before
> publication. A privacy policy that overstates a vendor's commitments is a
> deceptive practice under Section 5 of the FTC Act.

**Last updated:** [DATE] · **Effective:** [DATE]

---

## 1. In plain language, before the detail

CoachRhythm is software for personal trainers. Trainers use it to keep records
about their clients — including **injuries and health limitations** — and to
generate training programmes that work around those limitations.

That means we hold **health information about people who are not our customers
and who have never heard of us.** We take that seriously and we want to be
straightforward about it:

- **Your trainer decides what to record about you, not us.** If you are a
  client of a trainer who uses CoachRhythm, your trainer is responsible for
  telling you what they collect and for obtaining your consent. **We have no way
  to contact you.** All of your requests go to your trainer.
- **We use a third-party AI service** (Anthropic) to help draft training
  programmes. Information about you — your goals, your training history, your
  recent workout logs, and free-text notes your trainer writes about you — is
  sent to that service. Your name is not.
- **Your injury tags are not sent to the AI.** The unsafe exercises are removed
  by our own software *before* anything is sent, so the AI is never told what
  your injury is.
- **We do not sell your information. We do not share it for advertising. We do
  not use it to train AI models.** Not ours, not anyone's.
- **We run no analytics and no advertising trackers.** The only cookies we set
  are the ones that keep a trainer logged in. We use one error-monitoring tool
  to find crashes, deliberately configured so that it never receives names,
  injuries, notes, or any other information about you (§ 6).

The rest of this policy is the detail.

---

## 2. Who we are, and who is responsible for what

**[LEGAL ENTITY NAME]**, a [STATE] [entity type], operating as CoachRhythm.
Contact details are in § 14.

There are **two different relationships** here and it matters which one you are
in:

### 2.1 Trainers — our customers

If you are a personal trainer with a CoachRhythm account, you are our customer.
**We are the controller of your account information** (your email, your business
details, your billing information, your usage of the Service). This policy
describes what we do with it.

### 2.2 Clients — the people trainers record information about

If your personal trainer uses CoachRhythm, **your trainer is the controller of
your information and we are their processor.** We hold your information only
because your trainer put it there, we process it only on their instructions, and
we do not use it for our own purposes.

**Practically, this means:**

- Your trainer — not us — is responsible for telling you what they record and
  for obtaining your consent.
- **Requests to see, correct, or delete your information go to your trainer.**
  They can service them directly in the Service. If you contact us instead, we
  will refer you to your trainer, because we cannot verify your identity or
  determine whose records you are.
- If you do not know which trainer entered your information, we cannot find out
  for you. Ask your trainer.

Under laws that use the terms "controller"/"processor" or "business"/"service
provider," the trainer is the controller/business and CoachRhythm is the
processor/service provider. Our obligations to trainers are set out in our
[Data Processing Addendum](./DPA.md).

---

## 3. Health information — stated plainly

**CoachRhythm processes health information.** We are not going to describe it as
"wellness preferences," because it is not.

Specifically, trainers record injuries and limitations from a fixed clinical
vocabulary of fourteen values:

> shoulder impingement · rotator cuff injury · low back pain · lumbar disc
> injury · patellofemoral knee pain · ACL recovery · hip impingement (FAI) ·
> wrist pain · elbow tendinopathy · ankle instability · neck pain · uncontrolled
> hypertension · **pregnancy (2nd/3rd trimester)** · osteoporosis

Trainers may also record free-text detail about each limitation, free-text
training history, free-text session notes, body measurements, and logged workout
performance.

Several of these are **diagnoses**. One — pregnancy — is **reproductive health
information**, which is treated as especially sensitive under Washington,
Nevada, and California law. We treat all of it as **sensitive personal
information** and as **consumer health data** under the state laws described in
§ 10, and we apply the protections in this policy to all of it regardless of
which specific law applies.

**HIPAA note.** HIPAA generally does not apply to independent personal trainers,
because they do not bill health insurance electronically in the way HIPAA
requires for a provider to become a covered entity. **CoachRhythm is therefore
not a HIPAA business associate and this information is not "Protected Health
Information" as HIPAA defines it.** We say this because trainers ask, and we
would rather be accurate than reassuring: **we are not "HIPAA compliant," and
any vendor in this category who tells you they are should be asked what they
mean.** We hold this data to the standards described in this policy, which we
believe are appropriate to its sensitivity.

If you are a licensed healthcare provider who bills insurance, **do not use
CoachRhythm for your patients without contacting us first** — see § 5 of the
Terms of Service.

---

## 4. What we collect

### 4.1 From trainers (we are the controller)

| Category | Specifics | Why |
|---|---|---|
| Account | Email address, password (stored hashed by our authentication provider — we never see it) | Authentication |
| Profile | Business name, coach name, professional credentials | Branding on the PDFs your clients receive |
| Billing | Handled entirely by our payment processor. **We never see or store your full card number.** We receive a customer identifier, subscription status, and the last four digits | Subscriptions |
| Usage | Generation events (which client, workout type, parameters, timestamp) | Rate limiting, fraud prevention, support, billing |
| Technical | IP address, timestamps, error logs from our hosting provider | Security and reliability |
| Support | Whatever you send us | Answering you |

### 4.2 About clients (the trainer is the controller; we are the processor)

Trainers enter, and we store on their behalf:

| Category | Specifics |
|---|---|
| Identity | Full name; optionally email address and phone number |
| Goals | Free-text goals, plus structured goals with target dates |
| **Health** | **Limitation tags from the 14-value vocabulary above, plus free-text detail per limitation; free-text training history; free-text session notes; body measurements** |
| Training | Equipment inventory, logged workout performance (weights, reps, RPE, notes, dates) |
| Generated | Training plans, including the **list of exercises excluded for that client and the clinical rationale for each exclusion** — which is itself health information — plus automated quality-assurance reports |
| Delivery | A record that the trainer confirmed sending a plan, and the destination address they sent it to |

**Clients do not have accounts.** There is no client login, no client portal, and
no way for a client to interact with CoachRhythm.

### 4.3 What we do not collect

We do not collect: precise or approximate location data; biometric identifiers;
government identifiers; race, ethnicity, religion, or sexual orientation;
financial account details beyond what our payment processor holds; browsing
activity outside our Service; or information from data brokers or advertising
networks.

**We run no analytics platform, no advertising pixels, no heatmapping, and no
session recording.** We deliberately do not enable session replay in our
error-monitoring tool, because it would record a trainer's screen — including
client names and injuries — and send it to a third party.

---

## 5. How we use information — including the AI part

### 5.1 Ordinary uses

We use trainer account information to provide, secure, bill for, and support the
Service, to send service and legal notices, and to comply with law. We use
client information **only** to provide the Service to the trainer who entered
it, as described below and in the Data Processing Addendum.

**We do not use any information for advertising, profiling for marketing, or
sale.**

### 5.2 The AI service — exactly what is sent

Plans are drafted with the help of **Anthropic's Claude API.** This is the most
important disclosure in this policy, so here is precisely how it works:

**Step 1 — filtering happens first, on our systems.** Our own software
deterministically removes every exercise flagged as contraindicated for that
client's recorded limitations. This runs before anything is sent anywhere.

**Step 2 — what is sent to Anthropic:**

- the client's goals;
- the client's training history (free text);
- the client's recent logged workout performance (up to the 20 most recent
  entries);
- the trainer's recent session notes about the client (up to the 5 most recent,
  verbatim);
- any additional instructions the trainer typed for that generation;
- the client's equipment list, and whether they train remotely; and
- the already-filtered list of permitted exercises.

**Step 3 — what is NOT sent to Anthropic:**

- **the client's injury and limitation tags.** Because filtering happens first,
  the AI is never told what the client's injury is. It only receives a list of
  exercises that are already safe for them;
- **the client's name.** No direct identifier is transmitted;
- the client's email address, phone number, or body measurements;
- any trainer billing information.

**Step 4 — what comes back.** A structured programme referencing only exercises
from the filtered list. It is then re-checked by our own automated
quality-assurance code and presented to the trainer as a **draft for their
review**. The trainer, not the AI and not us, decides what the client receives.

**Anthropic's handling.** Under Anthropic's commercial terms for its API,
**inputs and outputs are not used to train its models.** Anthropic retains API
inputs and outputs for a limited period for trust and safety purposes.
`[[NOTE FOR COUNSEL AND FOUNDER: verify the exact current terms, the retention
period, and whether a zero-data-retention arrangement has been granted, IN
WRITING, before this paragraph is published. State the actual retention period
here rather than "a limited period." An overstatement is an FTC Section 5
problem, and this is exactly the sentence a regulator or an enterprise customer
will check.]]`

**Trainers: your free-text notes are sent to a third party.** If you record
something a client has not agreed to have shared, it leaves our systems.
Write accordingly.

### 5.3 Automated decision-making

Programmes are drafted by an automated system, but **no decision affecting a
client is made solely by automation.** Every plan is a draft. A qualified human
trainer reviews, edits, approves, and delivers it, and the Service is built to
require that. The trainer is professionally responsible for what the client
receives.

---

## 6. Who we share with

**We do not sell personal information. We have never sold personal information.
We do not share personal information for cross-context behavioural advertising.
We do not disclose client health information for any purpose other than
providing the Service.**

We use these service providers (subprocessors), each bound by contract to
process only on our instructions:

| Provider | Purpose | Data | Location |
|---|---|---|---|
| **Supabase** | Database, authentication, hosting | All stored trainer and client data | United States (US-East) |
| **Vercel** | Application hosting and delivery | Data in transit; request logs | United States |
| **Anthropic** | AI plan generation | The prompt contents listed in § 5.2 | United States |
| **Sentry** | Error monitoring | **Crash diagnostics only** — stack traces, route, environment. Configured to receive **no** names, injuries, notes, request bodies, headers, cookies, IP addresses, or user identifiers. See below | United States |
| **[Stripe]** | Payment processing | Trainer billing information only — **no client data** | United States |

**About error monitoring, specifically.** We use Sentry to find crashes. An
error tracker that is not carefully configured is one of the most common ways
health information leaks to a third party — the default settings on most such
tools send request bodies, headers, cookies, and IP addresses, which is exactly
how a client's name and diagnosis end up on someone else's dashboard. We have
configured ours the other way round: request bodies, headers, and cookies are
discarded outright, no user identifier is attached, IP collection is off,
console breadcrumbs are dropped, values under sensitive field names are
replaced before transmission, anything resembling an email address is scrubbed
from error text, and **session replay is disabled**. Error reports are routed
through our own domain rather than directly to a third-party host. **This
redaction is verified by an automated test suite**, because a regression in it
would be invisible in the product and discoverable only by reading someone
else's error dashboard.

The current list is maintained at [SUBPROCESSOR PAGE URL]. **We will give
trainers at least 30 days' notice before adding a new subprocessor** that
processes client data, and trainers may object as set out in the Data Processing
Addendum.

`[[DECISION: Payment processor. Stripe is assumed throughout. If a different
processor is chosen, update this table, the DPA, and the subprocessor page
together. Whichever is chosen, ensure client data never reaches it — only
trainer billing information.]]`

We may also disclose information: to comply with law or valid legal process
(we will notify the affected trainer unless legally prohibited); to establish or
defend legal claims; to protect against imminent harm; and in connection with a
merger or acquisition, on notice, with the acquirer bound by commitments no less
protective than these.

---

## 7. Where data is stored

**All data is stored and processed in the United States.** We do not currently
offer data residency elsewhere.

**We offer the Service only to customers in the United States** and trainers
represent that they will not use it to process information about individuals in
the EEA, the UK, or Switzerland. If your use involves individuals in those
regions, contact us before subscribing — we may not be able to serve you.

---

## 8. How long we keep it

`[[DECISION: Retention periods. The schedule below is a recommendation, chosen
to be short enough to limit breach exposure and to satisfy strict state
data-minimization standards, while preserving the safety audit trail. The plan
and QA-report line in particular should be set against the personal-injury
statute of limitations in the governing state — that record is the primary
evidence that the safety filter ran, and destroying it early would be a
significant own-goal in any injury claim. IMPLEMENTATION NOTE: none of this
retention schedule is currently automated. Build the scheduled purges before
publishing this section.]]`

| Data | Retained |
|---|---|
| Trainer account and profile | Life of the account |
| Client records, limitations, equipment, goals | Life of the account, or until the trainer deletes them |
| **Session notes** | **18 months**, then automatically deleted |
| **Workout performance logs** | **24 months**, then automatically deleted |
| Generated plans and QA reports | Life of the account, then per § 9 — retained as the record of what safety filtering was applied |
| Generation/usage events | 90 days, after which the link to a specific client is removed |
| Delivery records | 12 months |
| Billing records | As required by tax and accounting law (typically 7 years) |
| **All tenant data after account termination** | **30 days**, then permanently deleted |
| Encrypted backups | Our hosting provider's rotation schedule, currently up to [N] days |

**About backups, honestly:** when data is deleted from the live system it is
gone from the Service immediately, but it may persist in encrypted backups until
those backups rotate out. Backups are never restored to service selectively to
recover deleted records. We would rather tell you this than promise instant
erasure we cannot deliver.

---

## 9. Your rights and choices

### 9.1 If you are a trainer

- **Access and export.** Download everything in your account, any time, from the
  export function in the Service.
- **Correction.** Edit anything in the Service directly.
- **Deletion.** Delete individual client records at any time; deleting a client
  removes their limitations, equipment, goals, notes, logs, and plans. You may
  delete your entire account and all data from your account settings, or by
  emailing [PRIVACY EMAIL] — we will complete it within 30 days.
- **Marketing.** Unsubscribe from any marketing email. We will still send
  service and legal notices.

### 9.2 If you are a client of a trainer

**Contact your trainer.** They control your information, they can service your
request directly in the Service, and they are obliged to do so under our
agreement with them.

**If you contact us**, we will (a) tell you this, (b) forward your request to
the relevant trainer if you can identify them, and (c) support that trainer in
completing it. **We cannot act on your request directly**, because we cannot
verify your identity and we have no independent way to determine which records
are yours. This is a genuine limitation of a service where the individual has no
account, and we would rather explain it than pretend otherwise.

### 9.3 Verification and timing

We verify requests through the account email. We respond within the timeframes
required by applicable law — generally **45 days** under state comprehensive
privacy laws (extendable once by 45 days with notice), and **30 days** under the
Washington and Nevada consumer health data laws. **We do not charge**, and we do
not discriminate against anyone for exercising a right.

### 9.4 Authorized agents and appeals

You may use an authorized agent where state law allows; we will require proof of
authorization. If we deny a request, you may appeal by replying to our response,
and we will respond within the period your state's law requires. If we deny the
appeal, you may complain to your state Attorney General.

---

## 10. State-specific rights

### 10.1 Washington — My Health My Data Act

**Washington's My Health My Data Act (RCW 19.373) applies to the injury,
limitation, pregnancy, measurement, and health-related note data described in
§ 3 and § 4.2.** We treat all of it as "consumer health data."

**Our role.** The trainer who enters your information is the "regulated entity."
**CoachRhythm is a processor.** We process consumer health data only on the
trainer's documented instructions, under a binding contract, and never for our
own purposes.

**Your rights under MHMD:**

- to know what consumer health data we hold, how it is used, and with whom it is
  shared;
- to a list of the third parties with whom it is shared, and their contact
  information (see § 6);
- to withdraw consent to collection and to sharing; and
- **to have it deleted**, including from our backup and archive systems on our
  rotation schedule, with a response within 30 days.

**Exercise these rights through your trainer** (see § 9.2). We will support them
in fulfilling your request within the statutory window and, on a deletion
request, will delete from our systems and notify our processors.

**What we do not do, and will not do:** we do not sell consumer health data. We
have never sold consumer health data. We do not collect geolocation data of any
kind and do not operate any geofence around any facility. We do not use consumer
health data for advertising, profiling, or any secondary purpose.

**Washington residents:** MHMD is enforceable under the Washington Consumer
Protection Act, which permits private actions.

*Our separate Consumer Health Data Privacy Policy, required by MHMD, is at
[CONSUMER HEALTH DATA POLICY URL] and is linked from our homepage.*
`[[NOTE: MHMD requires a distinct consumer health data privacy policy with its
own prominent homepage link — separate from this policy and separate from the
general privacy policy link. This is a specific, unusual, easily-verified
requirement, and its absence is visible from the outside to anyone looking for
enforcement targets. Build the page and the link.]]`

### 10.2 Nevada — SB370 (NRS 603A.400 et seq.)

Nevada residents have comparable rights over consumer health data: to know what
is collected and shared, to withdraw consent to collection and sharing, and to
request deletion. We do not sell consumer health data as Nevada defines it, and
we have not done so in the preceding 12 months. Nevada's law is enforced by the
Nevada Attorney General. Exercise these rights through your trainer, or contact
us at [PRIVACY EMAIL] and we will route your request.

### 10.3 California

**CCPA/CPRA status.** We do not currently meet the thresholds to be a
"business" under the CCPA. Where we process personal information on behalf of a
customer who is a covered business, **we act as a "service provider"** and are
contractually restricted from retaining, using, or disclosing that information
for any purpose other than performing the services — and specifically from
selling or sharing it, or combining it with information from other sources
except as permitted. Those restrictions are in our Data Processing Addendum.

**Sensitive personal information.** Health information is "sensitive personal
information" under the CPRA. **We use it only to perform the Service** and for
no purpose that would trigger a right to limit its use. We do not use or
disclose it to infer characteristics.

**No sale, no sharing.** We have not sold or shared personal information in the
preceding 12 months, and we do not have actual knowledge of selling or sharing
the personal information of anyone under 16.

**CMIA.** California's Confidentiality of Medical Information Act may apply to
health information handled by certain software. **We treat the health
information described in § 3 as confidential medical information regardless**:
we do not disclose it without authorization, we do not use it for marketing, and
we maintain the access controls described in § 11. `[[NOTE FOR COUNSEL:
applicability of the post-AB-1184 "provider of health care" definition to B2B
professional recordkeeping software — where the data subject is not the
software's user — is genuinely unsettled and is the single highest-value
question to put to California counsel. CMIA's private right of action with
$1,000 nominal damages per violation, with no proof of harm required, is what
makes the uncertainty expensive. See ANALYSIS § 3.3.]]`

**California residents** have the rights in § 9 plus the right to know, delete,
correct, opt out of sale/sharing (inapplicable — we do neither), limit use of
sensitive personal information, and to non-discrimination.

**Shine the Light.** We do not disclose personal information to third parties
for their direct marketing purposes.

### 10.4 Other states

Residents of **Virginia, Colorado, Connecticut, Utah, Texas, Oregon, Montana,
Florida, Delaware, Iowa, Nebraska, New Hampshire, New Jersey, Tennessee,
Minnesota, Maryland, Indiana, Kentucky, Rhode Island**, and other states with
comprehensive privacy laws have rights to access, correct, delete, obtain a
portable copy, and opt out of sale, targeted advertising, and certain profiling.
**We do not sell personal data, do not engage in targeted advertising, and do
not profile individuals for decisions producing legal or similarly significant
effects.** Health data is "sensitive data" under these laws and requires
consent — which the trainer obtains, as described in § 2.2.

Exercise these rights through your trainer, or contact [PRIVACY EMAIL].

---

## 11. Security

We are a small company and we will describe our security truthfully rather than
impressively.

**What we do:**

- **Tenant isolation enforced in the database.** Every table carries an owner
  and is protected by PostgreSQL row-level security policies, so one trainer
  cannot read or write another trainer's data even if application-layer code
  were flawed. **This isolation is verified by an automated test suite that runs
  two tenants against a real PostgreSQL instance as a non-superuser.** This is
  the most important control we have and it is tested, not assumed.
- **Authentication and session enforcement** on every request, with protected
  routes on an allowlist so a new page is private by default.
- **Encryption in transit** (TLS) and **at rest**, as provided by our database
  and hosting providers.
- **Secrets in environment configuration only** — never in source code. Our
  application source is public; our credentials are not, and the codebase is
  structured so that no credential is stored server-side that would become a
  shared liability.
- **Rate limiting** on plan generation, to prevent abuse and cost exhaustion.
- **Least-privilege vendor access**, and a short subprocessor list.
- **Input validation** on all API boundaries.
- **Error monitoring configured to exclude personal and health information**,
  with the redaction verified by automated tests (§ 6).

**What we do not have, stated honestly:**

- No SOC 2 report, no ISO 27001 certification, no third-party penetration test
  as of this policy's date.
- No customer-managed encryption keys, no single sign-on, no audit-log export.
- No 24/7 security operations centre.

**No system is perfectly secure.** If we discover a breach affecting personal
information, we will notify affected trainers **without undue delay** and as
required by applicable state law, with the information needed to meet their own
notification obligations to their clients.

**Trainers:** your password protects every client record in your account.
Use a strong, unique one. Report suspected compromise to [SECURITY EMAIL].

---

## 12. Cookies

**We use only strictly necessary cookies** — the session cookies that keep a
trainer logged in and protect against cross-site request forgery.

**We do not use analytics cookies, advertising cookies, or any third-party
tracking technology.** Our error-monitoring tool sets no cookies, does not
track you across sites, and sends its reports through our own domain rather
than to a third-party host. There is nothing to consent to and no preference
centre, because there is nothing optional to set. If that ever changes, we will
update this policy and provide controls before deploying anything.

We do not respond to Global Privacy Control or Do Not Track signals, because we
do not engage in the sale, sharing, or targeted advertising that those signals
govern.

---

## 13. Children

The Service is not directed to children and trainers may not create accounts for
anyone under 18. **A trainer may record information about a client under 18 only
with verifiable parental or guardian consent**, which is the trainer's
responsibility under our Terms. If you believe a minor's information has been
recorded without that consent, contact us at [PRIVACY EMAIL] and we will work
with the relevant trainer to remove it.

---

## 14. Contact, changes, and complaints

**[LEGAL ENTITY NAME]** · [MAILING ADDRESS]
Privacy: **[PRIVACY EMAIL]** · Security: [SECURITY EMAIL] · General:
[CONTACT EMAIL]

`[[DECISION: Whether to publish a physical mailing address. Several state
privacy laws require a designated method of contact, and a P.O. box or
registered-agent address satisfies this without publishing a home address —
which is the right answer for a solo founder working from home. Arrange one
before publishing.]]`

**Changes.** We will post any revision here with a new "Last updated" date. For
**material** changes we will notify trainers by email and in-product at least
**30 days** in advance. We will not apply a material change retroactively to
information already collected without providing notice and, where required by
law, obtaining consent.

**Complaints.** Contact us first — we would rather fix it. You may also complain
to your state Attorney General, or to the Federal Trade Commission at ftc.gov.

---

*Draft prepared with AI assistance. Not reviewed by counsel. Not for use. Two
sections describe behaviour the software does not yet implement — see the notice
at the top of this document.*
