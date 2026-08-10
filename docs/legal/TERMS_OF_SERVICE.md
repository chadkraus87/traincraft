# CoachRhythm — Terms of Service

**DRAFT — NOT FOR USE.**

> **UNREVIEWED AI-ASSISTED DRAFT. NOT LEGAL ADVICE. DO NOT PUBLISH.**
> This agreement was prepared with AI assistance and has not been reviewed by a
> licensed attorney. It is a starting draft intended to be marked up by counsel,
> not a finished contract. It contains unresolved decisions marked
> `[[DECISION: ...]]` and bracketed placeholders that must be completed. It must
> be reviewed and approved by a licensed attorney in the governing jurisdiction
> before it is published, presented to any customer, or relied on.
> Auto-renewal, cancellation, and disclosure requirements under state
> automatic-renewal laws are jurisdiction-specific and changed materially in
> 2025; § 3 must be verified against current law before launch.

**Last updated:** [DATE]
**Effective:** [DATE]

---

## 1. Agreement to these Terms

These Terms of Service (the **"Terms"**) are a binding agreement between
**[LEGAL ENTITY NAME]**, a [STATE] [limited liability company / corporation]
(**"CoachRhythm," "we," "us," "our"**), and the individual or entity that
creates an account to use the CoachRhythm service (**"you," "your,"
"Trainer"**).

By creating an account, clicking to accept, or using the Service, you agree to
these Terms and to the **[Privacy Policy](./PRIVACY_POLICY.md)** and the
**[Data Processing Addendum](./DPA.md)**, each of which is incorporated by
reference. The Data Processing Addendum governs our handling of information
about your clients and, in the event of a conflict with these Terms as to that
subject matter, the Data Processing Addendum controls.

If you are accepting on behalf of an entity, you represent that you have
authority to bind that entity.

**If you do not agree, do not use the Service.**

`[[DECISION: Entity type and state of formation. RECOMMENDATION: a
single-member LLC in the founder's home state, taxed as a disregarded entity.
Operating as a sole proprietor means personal, unlimited liability for bodily
injury claims arising from training programmes — which is the principal risk of
this business, not a theoretical one. Delaware adds franchise tax and a
registered agent for no benefit absent outside investment. This must be resolved
before these Terms are published, because the contracting party must exist.]]`

---

## 2. The Service, and what it is not

### 2.1 What CoachRhythm does

CoachRhythm is a **programming aid for fitness professionals.** It lets you
record information about your clients — including goals, training history,
equipment, and injuries or limitations selected from a controlled clinical
vocabulary — and produces draft training programmes. It works by:

1. deterministically filtering an exercise library against the limitations you
   have recorded for that client, removing exercises flagged as
   contraindicated;
2. submitting the remaining, filtered set to a third-party artificial
   intelligence service, together with the client information described in the
   Privacy Policy, to draft a programme;
3. running an automated quality-assurance check over the result; and
4. presenting the draft to you, together with a report of what was excluded and
   why, for **your** review, editing, and approval.

### 2.2 What CoachRhythm is not

**CoachRhythm does not practice medicine, physical therapy, athletic training,
dietetics, or any licensed profession. It does not diagnose, treat, or manage
any medical condition. It does not provide medical advice, medical clearance,
or clinical judgment. It is not a medical device and has not been reviewed by
any regulatory authority.**

The contraindication filtering in the Service reflects **conservative
programming heuristics**, not clinical assessment. It cannot examine your
client, cannot know what you have not recorded, and cannot substitute for a
qualified healthcare professional. See § 8, which is the most important section
of this agreement and which you should read in full.

### 2.3 Eligibility

You must be at least 18 years old and legally able to enter into contracts. You
must hold any certification, licence, registration, or insurance required to
provide personal training services where you operate. **You are solely
responsible for confirming that your use of the Service falls within your scope
of practice.**

### 2.4 Geographic scope

`[[DECISION: US-only restriction. RECOMMENDATION: yes, at launch. The cost of
EU/UK readiness — Standard Contractual Clauses or Data Privacy Framework
certification, a transfer impact assessment, a DPIA for special-category health
data, and possibly an Article 27 representative — is a real five-figure spend
that a handful of unsolicited European signups cannot justify. Accepting them
without that apparatus is the worst outcome: full obligations, no machinery, and
a paying customer you cannot cleanly turn away. Enforce this at Stripe by
billing country rather than by IP geo-blocking; IP blocking is trivially evaded,
breaks travelling customers, and — being imperfect — is weaker evidence of
non-targeting than a clean contractual and billing restriction.]]`

The Service is offered only to customers located in the United States. **You
represent that you are located in the United States and that you will not use
the Service to process information about individuals located in the European
Economic Area, the United Kingdom, or Switzerland.** We may suspend or terminate
accounts that breach this section.

---

## 3. Subscription, billing, and cancellation

### 3.1 Plans and fees

The Service is provided on a subscription basis. Current plans and prices are at
[PRICING URL]. Fees are stated in US dollars and are **exclusive of taxes**; you
are responsible for all applicable sales, use, and similar taxes.

### 3.2 Automatic renewal

`[[DECISION: Subscription and auto-renewal mechanics. RECOMMENDATION: monthly
term, auto-renewing, cancellable at any time effective at the end of the current
period, no pro-rata refunds. IMPORTANT — automatic-renewal disclosure, consent,
reminder, and cancellation requirements are governed by state automatic-renewal
laws, California's being the strictest, and the federal position shifted in 2025
when the FTC's negative-option rule was set aside on appeal. The requirements
below are drafted conservatively to a California-style standard, but counsel
must confirm the currently applicable federal and state requirements before
launch. Getting this wrong is a common, cheap-to-avoid, and readily enforced
violation.]]`

**Your subscription renews automatically.** Specifically:

- Your subscription continues for successive [monthly / annual] terms until
  cancelled.
- At the start of each term we charge the payment method on file the
  then-current fee for that term.
- We will present the renewal frequency, the amount, and the cancellation
  method clearly before you subscribe, and obtain your affirmative consent to
  the automatic renewal separately from your acceptance of these Terms.
- We will send you a renewal reminder before each renewal, and before any price
  change takes effect.
- **You may cancel at any time**, through your account settings, in the same
  medium in which you subscribed and without having to speak to anyone.

### 3.3 Cancellation and refunds

Cancellation takes effect **at the end of the then-current billing period.** You
keep access until then. Fees already paid are **not refundable in whole or in
part**, except where a refund is required by law.

We may change prices on **at least 30 days' notice**. The change applies from
your next renewal. If you do not accept it, cancel before that renewal.

### 3.4 Failed payment

If a charge fails, we may retry and may suspend the Service. Suspension does not
relieve you of accrued fees. **Suspension does not delete your data** — see § 13
for what happens on termination, and note the 30-day restoration window.

### 3.5 Free trials and beta features

We may offer trials or beta features. Beta features are provided **as-is**, may
be changed or withdrawn at any time, and are excluded from any service
commitment. Unless we say otherwise, a trial converts to a paid subscription at
the end of the trial period unless you cancel first; we will tell you clearly,
in advance, when that will happen and what it will cost.

---

## 4. Your account

You are responsible for the confidentiality of your credentials and for all
activity under your account. **The Service segregates each Trainer's data at the
database layer; anyone with your credentials can see everything you have
recorded about every one of your clients.** Notify us immediately at
[SECURITY EMAIL] of any suspected unauthorized access.

Accounts are for a single Trainer. Do not share credentials. If your business
has multiple trainers, each needs their own account until we release team
functionality.

---

## 5. Acceptable use

You **will not**:

1. use the Service in any way that violates law, including health privacy,
   consumer protection, or professional licensing law;
2. enter information about a person **without having obtained the consents and
   provided the notices required by § 6**;
3. **use the Service as, or on behalf of, a HIPAA covered entity or business
   associate, or upload Protected Health Information, unless we have signed a
   Business Associate Agreement with you.** We have not signed one and do not
   offer one by default. If you are a licensed healthcare provider who bills
   health insurance electronically, contact us at [CONTACT EMAIL] before using
   the Service;
4. represent to any client, employer, or third party that the Service provides
   medical advice, medical clearance, physical therapy, or any licensed
   professional service, or that it is HIPAA compliant;
5. deliver a programme generated by the Service to a client **without first
   reviewing it yourself** (see § 8);
6. scrape, crawl, reverse engineer, decompile, or attempt to derive the source
   code, exercise library, contraindication rules, or prompts underlying the
   Service, except to the extent that restriction is unenforceable by law;
7. use the Service to build or train a competing product or machine-learning
   model, or to benchmark it for publication, without our prior written
   consent;
8. resell, sublicense, or provide the Service to third parties as a service
   bureau;
9. circumvent rate limits, quotas, or access controls, or generate load designed
   to consume our third-party API budget;
10. upload malicious code, or attempt to access another Trainer's data; or
11. enter information about a person under 18 without the verifiable consent of
    a parent or legal guardian.

We may suspend the Service immediately, without notice, for conduct we
reasonably believe violates this section or presents a risk to the Service, to
us, or to any person.

---

## 6. Your clients — consents, notices, and your role as controller

**This section is the foundation of the arrangement. Read it carefully.**

### 6.1 You are the controller

You decide which clients to enter into the Service, what to record about them,
and why. **You are the data controller** (and, where applicable, the "regulated
entity" under consumer health data laws). **We act only as your processor and
service provider**, acting on your documented instructions under the Data
Processing Addendum. We have no relationship with your clients, no way to
contact them, and no ability to obtain anything from them.

### 6.2 Your representations and warranties

You represent, warrant, and covenant, for each individual whose information you
enter into the Service, that:

**(a) Notice.** You have provided that individual with all notices required by
applicable law regarding the collection and use of their information, including
their health information.

**(b) Consent.** You have obtained all consents, authorizations, and permissions
required by applicable law to collect their health information and to disclose
it to us and our subprocessors — including, where applicable, **separate consent
for collection and for sharing** under the Washington My Health My Data Act,
Nevada SB370, and comparable state consumer health data laws, and **explicit
consent** under Article 9(2)(a) of the GDPR where it applies.

**(c) AI disclosure.** You have **specifically disclosed** to that individual
that a **third-party artificial intelligence service is used to help generate
their training programme**, and that information about them — including goals,
training history, recent performance logs, and free-text notes you record — is
transmitted to that service for that purpose.

**(d) Authority.** You have the authority and the lawful basis to disclose the
information to us for the purposes described in the Privacy Policy and the Data
Processing Addendum.

**(e) Accuracy.** The limitations and health information you record are accurate
and current to the best of your knowledge, and you will update them promptly
when they change. **You acknowledge that the Service's safety filtering can only
operate on what you have recorded, and that an unrecorded, outdated, or
incorrectly recorded limitation will not be filtered for.**

**(f) Requests.** Your clients' requests to access, correct, delete, or withdraw
consent come to **you**, not to us. You will handle them, and you will relay to
us promptly any request that requires action on our systems. We will assist as
described in the Data Processing Addendum.

**(g) Withdrawal.** You will not enter or continue to process information about
any individual who has withdrawn consent.

**(h) Minors.** You have obtained verifiable parental or guardian consent for
any individual under 18.

### 6.3 What we provide to help

We may make available a template client consent and intake form, and in-product
tools for recording that you have obtained consent. **These are conveniences,
not legal advice, and using them does not discharge your obligations under
§ 6.2.** You remain responsible for confirming with your own counsel that the
consents you obtain are adequate in your jurisdiction.

### 6.4 Consequence

**Your breach of § 6.2 is a material breach of these Terms** and is subject to
the indemnity in § 11.

---

## 7. Intellectual property

### 7.1 Ours

We own the Service, including the software, the exercise library, the
contraindication rule set, the quality-assurance logic, the prompts, the
CoachRhythm name and logo, and all related intellectual property. These Terms
grant you a **limited, non-exclusive, non-transferable, revocable licence** to
use the Service during your subscription for your internal business purposes.
No other rights are granted.

### 7.2 Yours — your data

**You own your data.** As between you and us, you retain all right, title, and
interest in the client records, limitations, equipment inventories, notes, logs,
goals, and other content you enter (**"Trainer Data"**). You grant us a
worldwide, non-exclusive, royalty-free licence to host, copy, transmit, display,
and process Trainer Data **solely** to provide, secure, and support the Service
in accordance with the Data Processing Addendum, and for no other purpose.

**We do not use Trainer Data to train machine-learning models — ours or anyone
else's.** We do not sell it. We do not share it for advertising. See the Privacy
Policy.

### 7.3 Generated plans

**You own the training programmes generated for your clients through your
account** ("Generated Plans"), subject to our underlying rights in § 7.1. You may
use, edit, brand, print, and deliver them to your clients without restriction or
attribution to us.

Two honest caveats:

- **Generated Plans are produced with machine assistance.** The copyright status
  of AI-generated material is unsettled in the United States, and purely
  machine-generated content may not be protectable by copyright. We assign to
  you whatever rights we have; we cannot warrant that a Generated Plan is
  protectable against copying by third parties.
- **Generated Plans are not unique to you.** The Service draws from a shared
  exercise library under shared programming rules; another Trainer with a
  similar client may receive a materially similar programme. We grant no
  exclusivity.

### 7.4 Feedback

If you send us suggestions or feedback, we may use them without restriction or
compensation. You are not obliged to send any.

---

## 8. **Safety, scope of practice, and your sole responsibility**

**THIS SECTION LIMITS OUR RESPONSIBILITY AND ASSIGNS RESPONSIBILITY TO YOU.
READ IT.**

### 8.1 The Service is a programming aid, not medical advice

**CoachRhythm is a drafting and programming tool for qualified fitness
professionals. It is not a medical device, not a clinical decision support
system, and not a source of medical advice.**

The Service does not and cannot:

- diagnose any condition;
- assess whether any individual is medically fit to exercise;
- provide, replace, or substitute for **medical clearance** from a physician or
  other qualified healthcare provider;
- replace your professional judgment, your in-person assessment, your movement
  screening, or your observation of the client in front of you;
- account for any condition, medication, symptom, or circumstance that has not
  been recorded in the Service; or
- guarantee that any exercise is safe or appropriate for any individual.

### 8.2 What the contraindication filtering actually is

The Service screens exercises against limitations **you** have recorded, using a
controlled vocabulary and a rule set built on **conservative general programming
heuristics.** This is a useful safety net and we take it seriously. It is not a
clinical assessment, and you must understand its limits:

- **It only knows what you told it.** An injury you did not record, described
  imprecisely, or failed to update is not screened for.
- **The controlled vocabulary is coarse.** A tag such as "low back pain" or
  "shoulder impingement" covers a wide range of presentations, severities, and
  stages of healing that a rule set cannot distinguish.
- **Exclusion means "do not auto-programme," not "unsafe for everyone."** The
  Service is deliberately conservative and will exclude movements that are
  appropriate for some clients. You may add them back — and if you do, **you are
  taking clinical responsibility for that decision.**
- **The Service does not detect contraindications outside its rule set** —
  including cardiovascular conditions, metabolic conditions, medication
  interactions, mental health considerations, recent surgery, or any condition
  not in the vocabulary.
- **Automated quality assurance checks structure, not safety in the clinical
  sense.** It verifies pool membership, movement balance, and volume sanity. A
  plan that passes has passed those checks — nothing more.

### 8.3 Medical clearance is your responsibility

**You are solely responsible for determining whether any client requires medical
clearance before beginning or continuing an exercise programme, and for
obtaining it.** This applies with particular force to clients with recorded
limitations such as uncontrolled hypertension, pregnancy, osteoporosis, disc
injury, or post-surgical recovery — and equally to conditions the Service does
not model at all.

**Do not use the Service to justify programming for a client who should be seen
by a physician, physical therapist, or other qualified provider first.**

### 8.4 You review every plan before delivery

**Every programme produced by the Service is a draft for your professional
review.** You must review it, exercise your own professional judgment, and edit
or reject anything unsuitable, **before** you deliver it to any client. Delivery
is your act, not ours — the Service does not send anything to your clients.

**By delivering a programme to a client, you represent that you have reviewed
it, that you have applied your own professional judgment, and that you accept
professional responsibility for its content.**

### 8.5 Scope of practice

You are responsible for staying within your scope of practice. Personal trainers
are not licensed to diagnose, to treat injury, to prescribe rehabilitation, or
to provide medical nutrition therapy. **Nothing in the Service — including
exclusion rationales, clinical terminology, or references to conditions —
expands your scope of practice or authorizes you to act outside it.** If a
client's presentation is outside your competence, refer them.

### 8.6 Assumption of responsibility

**You acknowledge and agree that you, and not CoachRhythm, are solely
responsible for the safety, appropriateness, and suitability of every training
programme you deliver to any client, whether or not it was generated by,
suggested by, or reviewed by the Service.**

---

## 9. Disclaimer of warranties

**THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTY OF ANY
KIND.**

**TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS,
IMPLIED, AND STATUTORY, INCLUDING THE IMPLIED WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, AND ANY WARRANTIES
ARISING FROM COURSE OF DEALING OR USAGE OF TRADE.**

**WITHOUT LIMITING THE FOREGOING, WE DO NOT WARRANT THAT:**

- **the Service or any generated programme is safe, appropriate, effective, or
  suitable for any individual;**
- **the contraindication filtering will identify or exclude every exercise that
  is inappropriate for any individual;**
- **the automated quality assurance will detect every error;**
- **AI-generated output will be accurate, complete, or free from error** — AI
  systems can and do produce plausible-looking output that is wrong;
- the Service will be uninterrupted, secure, or error-free; or
- defects will be corrected.

**No advice or information, whether oral or written, obtained from us or through
the Service, creates any warranty not expressly stated here.**

Some jurisdictions do not allow the exclusion of certain warranties. In those
jurisdictions, the exclusions apply to the fullest extent permitted.

---

## 10. Limitation of liability

**READ THIS SECTION. IT LIMITS THE AMOUNT YOU CAN RECOVER FROM US.**

### 10.1 Exclusion of indirect damages

**TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR ANY
INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR
FOR ANY LOSS OF PROFITS, REVENUE, DATA, BUSINESS, GOODWILL, OR ANTICIPATED
SAVINGS, ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE, WHETHER IN
CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR OTHERWISE, EVEN IF
WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.**

### 10.2 Cap

`[[DECISION: Liability cap. RECOMMENDATION: the greater of (a) fees paid in the
12 months before the claim, or (b) $100. A pure 12-month-fees cap on a
$30–50/month subscription produces a cap of a few hundred dollars, which a court
may find unconscionable given the nature of the risk — and an unconscionable cap
can be struck entirely, leaving no cap at all. Discuss with counsel and with
your insurance broker, because the cap and the E&O policy limits should be set
together, not independently.]]`

**OUR TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THESE TERMS OR THE
SERVICE WILL NOT EXCEED THE GREATER OF (A) THE TOTAL FEES YOU PAID US IN THE 12
MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (B) ONE
HUNDRED US DOLLARS ($100).**

This cap applies in the aggregate across all claims and causes of action.

### 10.3 Bodily injury — specifically

**WITHOUT LIMITING §§ 10.1 AND 10.2, AND TO THE MAXIMUM EXTENT PERMITTED BY LAW,
WE WILL NOT BE LIABLE FOR ANY CLAIM ARISING FROM PHYSICAL INJURY, AGGRAVATION OF
AN EXISTING INJURY OR CONDITION, ILLNESS, DISABILITY, OR DEATH SUSTAINED BY ANY
CLIENT OF YOURS OR ANY OTHER PERSON IN CONNECTION WITH A TRAINING PROGRAMME,
WHETHER OR NOT THAT PROGRAMME WAS GENERATED BY OR THROUGH THE SERVICE.**

**You acknowledge that you have reviewed § 8, that you have independently
evaluated the Service's suitability for your practice, and that you accept
professional responsibility for what you deliver to your clients.**

### 10.4 Exceptions

Nothing in this § 10 limits liability that cannot be limited by law, including
liability for fraud, fraudulent misrepresentation, gross negligence, or willful
misconduct. Some jurisdictions do not allow certain limitations; in those
jurisdictions our liability is limited to the fullest extent permitted.

### 10.5 Basis of the bargain

**You acknowledge that the fees reflect the allocation of risk in these Terms,
and that we would not provide the Service at these prices without §§ 8, 9, and
10.**

---

## 11. Indemnification

You will defend, indemnify, and hold harmless CoachRhythm and its officers,
members, employees, contractors, and agents from and against any claim, demand,
suit, proceeding, loss, liability, damage, penalty, cost, or expense (including
reasonable attorneys' fees) arising out of or relating to:

1. **any physical injury, aggravation of injury, illness, disability, or death
   sustained by any client of yours or any other person** in connection with a
   training programme you delivered, recommended, or supervised;
2. **your breach of § 6 (consents, notices, and AI disclosure)**, including any
   claim by a client that their health information was collected, used, or
   disclosed without their consent;
3. your breach of these Terms or of applicable law;
4. your negligence, willful misconduct, or acts outside your scope of practice;
5. any claim that Trainer Data infringes or misappropriates a third party's
   rights; or
6. any dispute between you and a client.

We will notify you promptly of any claim, give you control of the defence (with
counsel reasonably acceptable to us), and cooperate at your expense. **You may
not settle a claim in a way that imposes any obligation or admission on us
without our prior written consent.** We may participate with our own counsel at
our own expense.

---

## 12. Confidentiality and security

Each party will protect the other's non-public information with at least
reasonable care and will not disclose it except to personnel and advisors who
need it and are bound by confidentiality. This does not apply to information
that is public through no fault of the recipient, independently developed, or
lawfully received from a third party, or to disclosures required by law (with
notice to the other party where lawful).

Our security measures, and our obligations regarding your clients' information,
are described in the Privacy Policy and the Data Processing Addendum.

---

## 13. Term, termination, and data deletion

### 13.1 Term

These Terms begin when you create an account and continue until terminated.

### 13.2 Your right to terminate

Cancel at any time in your account settings. Cancellation takes effect at the
end of the current billing period. See § 3.3 on refunds.

### 13.3 Our right to terminate

We may suspend or terminate your account:

- **immediately**, for breach of § 5 (acceptable use) or § 6 (consents), for
  non-payment after notice, or where we reasonably believe continued access
  presents a risk of harm to any person or to the Service; or
- **on 30 days' notice**, for convenience, in which case we will refund the
  unused portion of any prepaid fees.

### 13.4 Effect of termination

On termination: your licence ends, access ends, and any fees accrued become
immediately due.

### 13.5 Data export and deletion

`[[DECISION: Post-termination retention period. RECOMMENDATION: 30 days. Long
enough to protect a customer who cancelled by mistake or who needs their data
back; short enough to limit the scope of any breach and to be defensible under
state data-minimization standards. NOTE FOR ENGINEERING: as of this draft, the
application has NO account-deletion or tenant-purge capability. Publishing this
section before that capability exists would be a misrepresentation. Build it
first.]]`

- **Before termination**, and for **30 days after**, you may export all of your
  data through the export function in the Service. **Export it. We will not be
  able to recover it afterwards.**
- **30 days after termination**, we will **permanently delete** your account and
  all Trainer Data, including all client records, limitations, notes, logs,
  goals, generated plans, and templates.
- **Deletion from routine encrypted backups occurs on our backup rotation
  schedule**, described in the Privacy Policy. Deleted data is not restored to
  the live system and is overwritten in the ordinary course of that rotation.
- We may retain (i) aggregated or de-identified data that cannot reasonably be
  used to identify you or any client, and (ii) records we are required to keep
  by law or that we reasonably need to retain to establish or defend a legal
  claim — retained under continuing confidentiality obligations and used for no
  other purpose.
- **You may request earlier deletion** at [PRIVACY EMAIL]. We will complete it
  within 30 days.

### 13.6 Survival

§§ 6.2 (representations), 7 (IP), 8 (safety), 9 (warranties), 10 (liability),
11 (indemnification), 12 (confidentiality), 13.4–13.6, 14, and 15 survive
termination.

---

## 14. Changes to the Service and to these Terms

We may modify the Service. We will not materially degrade core functionality
during a paid term without notice.

We may amend these Terms. For **material** changes we will give at least **30
days' notice** by email and in-product. Continued use after the effective date
constitutes acceptance. **If you do not accept a material change, cancel before
it takes effect; we will refund the unused portion of your current term.**

We will not apply a material change retroactively to a dispute that arose before
the change.

---

## 15. Governing law, disputes, and general terms

### 15.1 Governing law and venue

`[[DECISION: Governing law and venue. RECOMMENDATION: the founder's home state,
with exclusive venue in the county of the founder's principal place of business.
Choosing your home forum is the standard, cheap advantage for a small vendor.
IMPORTANT — a choice-of-law clause governs the CONTRACT. It does NOT displace
consumer-protection or health-privacy statutes that apply of their own force to
residents of other states. A Texas governing-law clause will not defeat a
Washington My Health My Data Act claim brought by a Washington resident, and
should not be relied on as if it would.]]`

These Terms are governed by the laws of the State of **[STATE]**, without regard
to conflict of laws principles. The parties submit to the exclusive jurisdiction
of the state and federal courts located in **[COUNTY, STATE]**.

### 15.2 Dispute resolution

`[[DECISION: Arbitration and class waiver — include or not? RECOMMENDATION: for
a B2B service sold to sole proprietors and small businesses, a mutual
arbitration clause with a class-action waiver is defensible and materially
reduces class-exposure, particularly given the per-violation statutory damages
available under the California CMIA. Counterweights: it is unpopular, it can
read as adversarial in a small-business market, and arbitration filing fees can
exceed the value of a small claim, which some courts treat as evidence of
unconscionability. Note also that a class waiver will not prevent a
representative action under every state statute. Decide with counsel; if
included, carve out small-claims court and injunctive relief for IP or
confidentiality breaches.]]`

Before filing any claim, the parties will attempt in good faith to resolve the
dispute by written notice to [LEGAL EMAIL] and 30 days of informal negotiation.

### 15.3 General

- **Entire agreement.** These Terms, the Privacy Policy, and the Data Processing
  Addendum are the entire agreement and supersede all prior discussions.
- **Severability.** If a provision is unenforceable, it is modified to the
  minimum extent necessary or severed; the rest remains in effect.
- **No waiver.** Failure to enforce is not a waiver.
- **Assignment.** You may not assign without our written consent. We may assign
  in connection with a merger, acquisition, or sale of assets, on notice to you.
- **Force majeure.** Neither party is liable for delay or failure caused by
  events beyond its reasonable control, excluding payment obligations.
- **Independent contractors.** No partnership, joint venture, employment, or
  agency relationship is created.
- **Notices.** To you: the email on your account. To us: [LEGAL EMAIL].
- **No third-party beneficiaries.** Your clients are not third-party
  beneficiaries of these Terms. `[[NOTE FOR COUNSEL: verify this against § 11
  — a client injured by a programme sues in tort, not as a beneficiary of this
  contract, so this clause does not protect against that claim. It is here to
  prevent contract-based claims only. The protection against the injury claim is
  §§ 8, 10.3, and the insurance policy — not this sentence.]]`
- **Export and sanctions.** You represent you are not located in an embargoed
  jurisdiction or on a restricted-party list.
- **US Government users.** The Service is "commercial computer software" under
  FAR 12.212 and DFARS 227.7202.

---

## 16. Contact

**[LEGAL ENTITY NAME]**
[MAILING ADDRESS]
General: [CONTACT EMAIL] · Legal: [LEGAL EMAIL] · Privacy: [PRIVACY EMAIL] ·
Security: [SECURITY EMAIL]

---

*Draft prepared with AI assistance. Not reviewed by counsel. Not for use.*
