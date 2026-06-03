# Scrum Methodology: A Comprehensive Technical Documentary

> **🇲🇽 ¿Qué es esto?**
> *Este documento es un documental técnico completo sobre Scrum, un método de trabajo ágil para crear productos en equipo. Lo encontrarás todo: qué es, cómo funciona, sus roles, sus eventos y cómo se recoge la información para aplicarlo.*

---

## Table of Contents

1. [Abstract](#abstract)
2. [Introduction](#introduction)
3. [Theoretical Foundations](#theoretical-foundations)
4. [Information Gathering Methods](#information-gathering-methods)
5. [Requirements Analysis](#requirements-analysis)
6. [The Scrum Framework](#the-scrum-framework)
7. [Scrum Roles and Accountabilities](#scrum-roles-and-accountabilities)
8. [Scrum Events](#scrum-events)
9. [Scrum Artifacts](#scrum-artifacts)
10. [The Sprint Lifecycle](#the-sprint-lifecycle)
11. [Definition of Done](#definition-of-done)
12. [Scrum in Practice: Implementation Guidelines](#scrum-in-practice-implementation-guidelines)
13. [Metrics and Performance Indicators](#metrics-and-performance-indicators)
14. [Conclusion](#conclusion)
15. [References](#references)

---

## Abstract

> **🇲🇽 Resumen breve:** *De qué trata todo el documento en pocas palabras.*

This documentary provides an in-depth technical examination of the **Scrum framework**, one of the most widely adopted agile methodologies in software engineering and product development. The document covers the empirical foundations of Scrum, its structural components, information-gathering techniques used during its application, and the analytical processes involved in requirements elicitation and management. Special attention is given to the Sprint lifecycle, from inception to the declaration of completion, which is reached exclusively when the delivered increment constitutes a **functional, working product**.

---

## Introduction

> **🇲🇽 Introducción:** *¿Por qué existe Scrum y qué problema resuelve?*

In the landscape of modern software development, the need for **adaptive, iterative, and collaborative** project management has given rise to a suite of methodologies collectively known as Agile frameworks. Among these, **Scrum** stands out as a lightweight yet powerful framework that enables teams to address complex, adaptive problems while delivering products of the highest possible value.

Scrum was formally defined by **Ken Schwaber** and **Jeff Sutherland** in the early 1990s and has since been codified in the *Scrum Guide*, last updated in November 2020. It is not a process, technique, or definitive method. Rather, it is a **framework within which various processes and techniques may be employed**.

The core value proposition of Scrum rests on three pillars:

| Pillar | Description |
|---|---|
| **Transparency** | Significant aspects of the process must be visible to those responsible for the outcome. |
| **Inspection** | Scrum artifacts and the progress toward agreed goals must be inspected frequently. |
| **Adaptation** | If any aspect of the process deviates outside acceptable limits, the process or material being processed must be adjusted. |

---

## Theoretical Foundations

> **🇲🇽 Base teórica:** *Los principios filosóficos que hacen que Scrum funcione.*

### Empiricism and Lean Thinking

Scrum is grounded in **empiricism**, which asserts that knowledge comes from experience and that decisions must be based on what is observed. It also incorporates **Lean thinking**, which focuses on reducing waste and concentrating on the essential.

Unlike predictive (waterfall) project management approaches—where all planning is done upfront and deviation is costly—Scrum embraces **uncertainty as a constant**. The framework is built to thrive in environments where requirements evolve and complete information is rarely available from the outset.

### The Scrum Values

Successful use of Scrum depends on individuals becoming more proficient in living five core values:

- **Commitment** — Team members personally commit to achieving the Sprint Goal.
- **Focus** — The primary focus is on the work of the Sprint and its objectives.
- **Openness** — The Scrum Team and stakeholders are open about the work and its challenges.
- **Respect** — Members of the Scrum Team respect each other as capable, independent professionals.
- **Courage** — The team has the courage to do the right thing and work through difficult problems.

---

## Information Gathering Methods

> **🇲🇽 Métodos de recolección de información:** *¿Cómo sabe el equipo qué necesita hacer? Aquí se explican las 4 técnicas principales.*

Before a Scrum project can commence, and continuously throughout its lifecycle, the team must gather high-quality information to populate the **Product Backlog** and understand stakeholder needs. The following are the primary empirical methods employed.

---

### 1. Interviews

> **🇲🇽** *Se habla directamente con usuarios o clientes para entender sus necesidades.*

**Interviews** are structured or semi-structured conversations conducted between analysts or the Product Owner and key stakeholders, end-users, domain experts, or clients. They are one of the most direct and effective techniques for eliciting explicit and tacit knowledge.

**Characteristics:**
- Can be conducted one-on-one or in small groups.
- May follow a **structured** format (predefined questions), **semi-structured** (guided but flexible), or **unstructured** (open-ended, exploratory).
- Generate qualitative, contextual data that is difficult to obtain through other means.

**Application in Scrum:**
- Interviews are primarily used during **Product Backlog refinement** to clarify the intent behind user stories.
- The **Product Owner** typically leads interviews with clients to translate business needs into backlog items.
- Interviews help uncover **hidden requirements** that stakeholders may not have initially articulated.

**Best Practices:**
- Record sessions with consent to prevent data loss.
- Conduct follow-up interviews as requirements evolve.
- Use open-ended questions to encourage expansive responses.

---

### 2. Surveys and Questionnaires

> **🇲🇽** *Se manda un cuestionario a muchas personas para obtener información a escala.*

**Surveys** enable teams to collect standardized information from a large number of participants efficiently. Unlike interviews, they are scalable and can reach geographically distributed stakeholders simultaneously.

**Characteristics:**
- Utilize closed-ended questions (multiple choice, Likert scales) or open-ended fields.
- Can be administered digitally or in paper format.
- Produce **quantitative data** suitable for statistical analysis.

**Application in Scrum:**
- Surveys are particularly effective for **prioritization exercises** when seeking feedback from a broad user base.
- Teams may use surveys post-Sprint to gauge **stakeholder satisfaction** with delivered increments.
- They help validate assumptions embedded in user stories before significant development effort is invested.

**Limitations:**
- Lower response rates may introduce selection bias.
- Surveys cannot capture nuanced emotional or contextual responses as effectively as interviews.

---

### 3. Observation (Ethnographic Study)

> **🇲🇽** *El analista observa directamente cómo trabajan los usuarios en su entorno real.*

**Observation** involves directly watching end-users interact with existing systems, perform tasks within their natural work environment, or engage with product prototypes. This method surfaces **implicit requirements**—knowledge that users possess but cannot easily articulate verbally.

**Characteristics:**
- Can be **active** (the observer participates or asks questions in real-time) or **passive** (the observer records behavior without intervention).
- Yields **behavioral data** that supplements self-reported user feedback.
- Particularly valuable in complex domain environments where users have deeply ingrained workflows.

**Application in Scrum:**
- Observation sessions inform the creation of **user personas** and **journey maps** that guide Sprint planning.
- The **Development Team** may conduct observation sessions to better understand the technical constraints of the operating environment.
- Usability testing during Sprint Reviews incorporates observational techniques to assess the functionality of delivered increments.

**Types of Observation:**
| Type | Description |
|---|---|
| **Direct Observation** | Analyst observes real-time user behavior in their environment. |
| **Contextual Inquiry** | Analyst observes and intermittently interviews users during their tasks. |
| **Shadowing** | Analyst follows a user through a complete workflow across an extended period. |

---

### 4. Documentary Investigation

> **🇲🇽** *Se revisan documentos, manuales o registros existentes para encontrar información ya documentada.*

**Documentary investigation** (also known as document analysis or desk research) involves the systematic review of existing organizational artifacts, records, technical specifications, regulatory frameworks, and historical data to extract requirements and contextual knowledge.

**Characteristics:**
- Non-intrusive; does not require scheduling time with stakeholders.
- Provides **objective, traceable evidence** of existing system behavior and business rules.
- Useful for identifying **legacy constraints** that must be preserved or addressed.

**Application in Scrum:**
- Review of existing system documentation, user manuals, and business process flowcharts informs early **Epic** and **Feature** definition in the Product Backlog.
- Regulatory documents (e.g., compliance standards, industry regulations) help define **non-functional requirements** and acceptance criteria.
- Previous project retrospectives and post-mortems contribute to informed **Sprint planning**.

**Common Document Sources:**
- System architecture diagrams
- Previous requirements specifications
- Business process documentation
- Regulatory and compliance frameworks
- User manuals and training materials
- Help desk logs and issue trackers

---

## Requirements Analysis

> **🇲🇽 Análisis de requisitos:** *Separar qué debe hacer el sistema (funcional) de cómo debe comportarse (no funcional).*

Requirements analysis is the systematic process of defining, documenting, and maintaining requirements throughout the Scrum lifecycle. Within Scrum, this activity is continuous and iterative, primarily owned by the **Product Owner** in collaboration with the team and stakeholders.

### What Analysis Addresses

A critical analytical question that drives all requirements work in Scrum is:

> **"What does the system need to do, and how must it perform?"**

This question bifurcates into two fundamental categories of requirements.

---

### Functional Requirements

> **🇲🇽** *Lo que el sistema DEBE HACER: sus funciones y comportamientos concretos.*

**Functional requirements** describe the specific behaviors, functions, and capabilities that a system must exhibit. They define **what the system does**.

**Characteristics:**
- Expressed as user stories, use cases, or feature descriptions.
- Directly tied to business value and user objectives.
- Validated through acceptance criteria during **Sprint Reviews**.

**Examples in Scrum User Story Format:**

```
As a [user role],
I want [functionality],
So that [business value].
```

| Category | Example Functional Requirement |
|---|---|
| Authentication | The system shall allow registered users to log in using email and password credentials. |
| Data Management | The system shall enable administrators to export user activity reports in CSV format. |
| Notifications | The system shall send an email notification when an order status changes. |
| Search | The system shall return relevant results within 2 seconds for any search query. |

**Management in Scrum:**
- Functional requirements are captured as **User Stories** or **Tasks** in the Product Backlog.
- They are refined, estimated, and prioritized during **Backlog Refinement** sessions.
- Acceptance criteria for each functional requirement are agreed upon before a story enters a Sprint.

---

### Non-Functional Requirements

> **🇲🇽** *Cómo debe COMPORTARSE el sistema: velocidad, seguridad, disponibilidad, etc.*

**Non-functional requirements** (NFRs) define the **quality attributes**, constraints, and operational characteristics of a system. They describe **how the system performs** its functions rather than what it does.

**Classification of Non-Functional Requirements:**

| Category | Description | Example |
|---|---|---|
| **Performance** | Response time, throughput, and latency constraints. | The system must handle 10,000 concurrent users with <500ms response time. |
| **Security** | Data protection, authentication, and authorization requirements. | All data transmissions must be encrypted using TLS 1.3 or higher. |
| **Reliability** | System uptime, fault tolerance, and recovery capabilities. | The system must maintain 99.9% uptime, excluding scheduled maintenance. |
| **Scalability** | Ability to handle growing workloads or expand capabilities. | The architecture must support horizontal scaling to accommodate peak loads. |
| **Usability** | User experience quality and accessibility standards. | The interface must comply with WCAG 2.1 Level AA accessibility guidelines. |
| **Maintainability** | Ease of modification, debugging, and technical debt management. | Code coverage from automated tests must remain above 80%. |
| **Compliance** | Adherence to legal, regulatory, or industry standards. | The system must comply with GDPR data privacy requirements. |
| **Portability** | Compatibility across environments, platforms, or devices. | The application must function on Chrome, Firefox, Safari, and Edge browsers. |

**Management in Scrum:**
- NFRs are often incorporated into the **Definition of Done** to ensure every increment meets minimum quality standards.
- They may also appear as explicit **backlog items** when significant architectural work is required.
- The **Development Team** is responsible for ensuring NFRs are satisfied within each Sprint.

---

## The Scrum Framework

> **🇲🇽 El marco Scrum:** *La estructura completa de cómo se organiza el trabajo en Scrum.*

The Scrum framework consists of three formal components: **Accountabilities (Roles)**, **Events**, and **Artifacts**. Each serves a specific purpose and is governed by rules that bind them together.

```
┌─────────────────────────────────────────────────────────────┐
│                        SCRUM FRAMEWORK                       │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │    ROLES     │   │    EVENTS    │   │  ARTIFACTS   │    │
│  │              │   │              │   │              │    │
│  │ Product Owner│   │ Sprint       │   │ Product      │    │
│  │ Scrum Master │   │ Sprint Plan. │   │ Backlog      │    │
│  │ Developers   │   │ Daily Scrum  │   │ Sprint       │    │
│  │              │   │ Sprint Rev.  │   │ Backlog      │    │
│  │              │   │ Retrospective│   │ Increment    │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Scrum Roles and Accountabilities

> **🇲🇽 Roles:** *Las tres personas (o grupos) que forman un equipo Scrum y qué hace cada uno.*

The Scrum Team is a **small, cross-functional, self-managing unit** composed of three distinct accountabilities. There are no hierarchies or sub-teams within a Scrum Team. The team is collectively responsible for all product-related activities.

**Recommended team size:** 10 or fewer individuals. Smaller teams communicate better and are more productive.

---

### Product Owner

> **🇲🇽** *La persona que decide QUÉ se construye y en qué orden. Es el puente entre el negocio y el equipo.*

The **Product Owner** is accountable for maximizing the value of the product resulting from the work of the Scrum Team. This is a **single person**, not a committee.

**Primary Responsibilities:**
- Developing and explicitly communicating the **Product Goal**.
- Creating and communicating **Product Backlog items** clearly.
- Ordering Product Backlog items according to business value and strategic objectives.
- Ensuring the Product Backlog is **transparent, visible, and understood**.
- Acting as the sole authority on what the Development Team works on.

**Key Authority:** The Product Owner's decisions are visible in the content and ordering of the Product Backlog. No one is permitted to instruct the Developers to work from a different set of requirements.

---

### Scrum Master

> **🇲🇽** *El facilitador del equipo. Protege al equipo, elimina obstáculos y enseña Scrum a todos.*

The **Scrum Master** is accountable for establishing Scrum as defined in the Scrum Guide. They serve the Scrum Team by helping everyone understand Scrum theory and practice. The Scrum Master is a **servant-leader** for the Scrum Team.

**Service to the Scrum Team:**
- Coaching team members in self-management and cross-functionality.
- Helping the team focus on creating high-value Increments that meet the Definition of Done.
- Removing **impediments** to the team's progress.
- Ensuring all Scrum events take place and are productive.

**Service to the Product Owner:**
- Helping find techniques for effective Product Goal definition and Product Backlog management.
- Helping the Scrum Team understand the need for clear and concise Product Backlog items.
- Facilitating stakeholder collaboration.

**Service to the Organization:**
- Leading, training, and coaching the organization in its Scrum adoption.
- Planning and advising Scrum implementations within the organization.
- Removing barriers between stakeholders and Scrum Teams.

---

### Developers

> **🇲🇽** *El equipo que realmente construye el producto. Son autoorganizados y multidisciplinarios.*

**Developers** are the people on the Scrum Team who are committed to creating any aspect of a usable Increment each Sprint. The specific skills needed by the Developers are often broad and will vary with the domain of work.

**Responsibilities:**
- Creating a plan for the Sprint—the **Sprint Backlog**.
- Instilling quality by adhering to a **Definition of Done**.
- Adapting their plan each day toward the **Sprint Goal**.
- Holding each other accountable as professionals.

**Key Characteristic:** Developers are cross-functional. Together, they must possess all the skills necessary to create value in every Sprint, without depending on individuals outside the team.

---

## Scrum Events

> **🇲🇽 Eventos:** *Las reuniones y actividades formales que ocurren en cada ciclo de trabajo (Sprint).*

Scrum prescribes five formal events. Each event is an opportunity for inspection and adaptation. Failing to conduct these events results in lost opportunities to inspect and adapt, and may introduce risks.

---

### The Sprint

> **🇲🇽** *El ciclo de trabajo. Dura entre 1 y 4 semanas, y siempre termina con algo funcional.*

The **Sprint** is the heartbeat of Scrum. It is a fixed-length event of **one month or less** during which a "Done," usable, and potentially releasable product Increment is created.

**Sprint Characteristics:**
- A new Sprint begins immediately after the conclusion of the previous Sprint.
- All the work necessary to achieve the Product Goal occurs within Sprints.
- **No changes** are made that would endanger the Sprint Goal.
- Quality does not decrease throughout the Sprint.
- The Product Backlog is refined as needed.
- Scope may be clarified and renegotiated with the Product Owner as more is learned.

**Sprint Cancellation:**
A Sprint can be cancelled if the Sprint Goal becomes obsolete. Only the **Product Owner** has the authority to cancel a Sprint.

---

### Sprint Planning

> **🇲🇽** *La reunión donde el equipo decide QUÉ va a hacer durante el Sprint.*

**Sprint Planning** initiates the Sprint by laying out the work to be performed. The resulting plan is created by the **collaborative work of the entire Scrum Team**.

**Duration:** Maximum of **8 hours** for a one-month Sprint (proportionally shorter for shorter Sprints).

**Sprint Planning addresses three topics:**

| Topic | Question Addressed |
|---|---|
| **Why** | Why is this Sprint valuable? (Sprint Goal) |
| **What** | What can be Done this Sprint? (Selected backlog items) |
| **How** | How will the chosen work get done? (Technical plan) |

---

### Daily Scrum

> **🇲🇽** *Una reunión corta de 15 minutos cada día para sincronizar al equipo y detectar obstáculos.*

The **Daily Scrum** is a **15-minute event** for the Developers of the Scrum Team. Its purpose is to inspect progress toward the Sprint Goal and adapt the Sprint Backlog as necessary.

**Structure:** The Developers can select whatever structure and techniques they want, as long as their Daily Scrum focuses on progress toward the Sprint Goal and produces an **actionable plan for the next day of work**.

**Benefits:**
- Improves communication and eliminates the need for other meetings.
- Identifies impediments promptly.
- Promotes quick decision-making.
- Reinforces accountability among team members.

---

### Sprint Review

> **🇲🇽** *Al final del Sprint, el equipo muestra lo que construyó a los interesados y recibe retroalimentación.*

The **Sprint Review** is held at the end of the Sprint to inspect the outcome of the Sprint and determine future adaptations.

**Duration:** Maximum of **4 hours** for a one-month Sprint.

**Key Activities:**
- The Scrum Team presents the results of their work to key stakeholders.
- Progress toward the Product Goal is discussed.
- Attendees collaborate on what to do next.
- The **Product Backlog may be adjusted** to reflect new opportunities or learnings.

**Important Note:** The Sprint Review is a **working session**, not merely a presentation. It should not be treated as a gate to approve or reject work.

---

### Sprint Retrospective

> **🇲🇽** *El equipo reflexiona sobre CÓMO trabajó (no sobre el producto) para mejorar continuamente.*

The **Sprint Retrospective** concludes the Sprint. Its purpose is to plan ways to increase quality and effectiveness.

**Duration:** Maximum of **3 hours** for a one-month Sprint.

**Focus Areas:**
- Individuals, interactions, processes, tools, and the Definition of Done.
- What went well during the Sprint.
- What problems were encountered.
- How those problems were or were not solved.

**Output:** The Scrum Team identifies the most helpful changes to improve its effectiveness and adds them to the Sprint Backlog for the next Sprint.

---

## Scrum Artifacts

> **🇲🇽 Artefactos:** *Los documentos y entregables que usa Scrum para dar visibilidad al trabajo.*

Scrum's artifacts represent work or value. They are designed to maximize transparency of key information so everyone inspecting them has the same basis for adaptation.

---

### Product Backlog

> **🇲🇽** *La lista ordenada de TODO lo que se quiere construir en el producto. El Product Owner la gestiona.*

The **Product Backlog** is an emergent, ordered list of what is needed to improve the product. It is the single source of work undertaken by the Scrum Team.

**Characteristics:**
- Owned and managed exclusively by the **Product Owner**.
- Never complete; it evolves as the product and environment evolves.
- Items at the top are more refined, smaller, and better understood.
- Items lower in the list are less refined and represent future work.

**Commitment: Product Goal**
The Product Goal describes a **future state of the product** and serves as the long-term objective for the Scrum Team. It exists in the Product Backlog.

---

### Sprint Backlog

> **🇲🇽** *La lista de tareas que el equipo se compromete a terminar durante un Sprint.*

The **Sprint Backlog** is composed of the Sprint Goal (why), the set of Product Backlog items selected for the Sprint (what), and an actionable plan for delivering the Increment (how).

**Characteristics:**
- Created by the **Developers** during Sprint Planning.
- Updated throughout the Sprint as more is learned.
- Visible to all in real-time (commonly displayed on a physical or digital Scrum board).
- Only the **Developers** can change the Sprint Backlog during the Sprint.

**Commitment: Sprint Goal**
The Sprint Goal is the single objective for the Sprint. It provides flexibility while maintaining focus and coherence throughout the Sprint.

---

### Increment

> **🇲🇽** *El resultado concreto de cada Sprint: algo real y funcional que se puede mostrar o entregar.*

An **Increment** is a concrete stepping stone toward the Product Goal. Each Increment is additive to all prior Increments and thoroughly verified, ensuring that all Increments work together.

**Commitment: Definition of Done**
The Definition of Done is a formal description of the state of the Increment when it meets the quality measures required for the product.

---

## The Sprint Lifecycle

> **🇲🇽 Ciclo de vida del Sprint:** *Cómo fluye un Sprint de principio a fin, paso a paso.*

The following diagram illustrates the complete lifecycle of a Sprint within the Scrum framework:

```
    ┌──────────────────────────────────────────────────────────────┐
    │                     SPRINT LIFECYCLE                          │
    └──────────────────────────────────────────────────────────────┘

    PRODUCT             SPRINT              SPRINT
    BACKLOG   ───────►  PLANNING   ──────►  BACKLOG
    (Ordered)           (What + How)        (Tasks)
                                               │
                                               ▼
                                         ┌─────────────────┐
                                         │   SPRINT (1-4   │
                                         │     weeks)      │
                                         │                 │
                                         │  ┌───────────┐  │
                                         │  │Daily Scrum│  │
                                         │  │(15 min/   │  │
                                         │  │ day)      │  │
                                         │  └───────────┘  │
                                         └────────┬────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │    INCREMENT    │
                                         │  (Functional    │
                                         │   Software)     │
                                         └────────┬────────┘
                                                  │
                              ┌───────────────────┴──────────┐
                              ▼                              ▼
                       SPRINT REVIEW               SPRINT RETROSPECTIVE
                    (Inspect Increment)           (Inspect Process)
                              │
                              ▼
                       NEXT SPRINT ──────────────────────────────►
```

---

## Definition of Done

> **🇲🇽 Definición de Terminado:** *¿Cuándo se declara que un Sprint está listo? Solo cuando el software es funcional y cumple todos los criterios de calidad.*

The **Definition of Done (DoD)** is one of the most critical concepts in Scrum. It represents the collective understanding of what it means for work to be **complete**.

### Declaration of Sprint Completion

> A Sprint is declared **Done** when the delivered Increment is **fully functional** — meaning the software operates as intended, meets all acceptance criteria, and satisfies the agreed quality standards.

This principle reflects a fundamental truth in Scrum: **partial work has no value**. A Sprint cannot be considered complete based solely on effort expended, tasks created, or documentation produced. The increment must be **working software**.

### Components of a Robust Definition of Done

The DoD typically includes verification across all of the following dimensions:

| Dimension | Criteria Examples |
|---|---|
| **Functionality** | All acceptance criteria for selected user stories have been met. The software behaves as specified. |
| **Code Quality** | Code has been peer-reviewed. No critical static analysis violations exist. |
| **Testing** | Unit tests written and passing. Integration tests passing. Regression suite passing. |
| **Performance** | Non-functional performance benchmarks met (response time, load capacity). |
| **Security** | Security vulnerabilities scanned. Known critical/high vulnerabilities resolved. |
| **Documentation** | Technical documentation updated. Release notes prepared if applicable. |
| **Deployment** | Increment deployed to a production-equivalent environment. |
| **Accessibility** | Accessibility standards verified (if applicable). |

### Why "Functional" Is the Standard

The requirement for **functional software** as the criterion for Sprint completion is deliberate:

1. **It prevents false progress.** A team cannot declare a Sprint done merely because development tasks were completed without testing or integration.
2. **It enforces quality continuously.** By requiring a functional increment every Sprint, technical debt is not deferred indefinitely.
3. **It enables real feedback.** Stakeholders can only provide meaningful feedback on **working software**, not on code that exists but cannot be executed.
4. **It supports releasability.** Even if the Product Owner chooses not to release the increment, the product must be in a state where release is technically possible.

---

## Scrum in Practice: Implementation Guidelines

> **🇲🇽 Implementación práctica:** *Consejos concretos para aplicar Scrum en un equipo real.*

### Establishing the Product Backlog

1. Conduct initial information-gathering sessions using **interviews**, **surveys**, **observation**, and **documentary investigation**.
2. Translate gathered insights into **Epics** (large bodies of work) and decompose them into **User Stories**.
3. Apply the **INVEST** criteria to validate each story:
   - **I**ndependent
   - **N**egotiable
   - **V**aluable
   - **E**stimable
   - **S**mall
   - **T**estable

### Writing Effective User Stories

```
Story:    As a [role], I want [capability], so that [benefit].
Criteria: Given [context], when [action], then [outcome].
```

### Estimating Backlog Items

Teams commonly use **Story Points** and **Planning Poker** to estimate relative complexity:

| Fibonacci Scale | Interpretation |
|---|---|
| 1 | Trivial; fully understood; minimal risk |
| 2 | Small; well understood; low risk |
| 3 | Medium; some uncertainty |
| 5 | Moderate; notable uncertainty or complexity |
| 8 | Large; significant unknowns |
| 13 | Very large; consider decomposition |
| 21+ | Too large; must be broken down |

### Conducting Effective Sprint Reviews

- Invite **all relevant stakeholders**, not just the immediate team.
- Focus the review on the **increment**, not on the process or individual performance.
- Document feedback as **new Product Backlog items** immediately.
- Revisit the **Product Goal** and assess whether strategic priorities have shifted.

---

## Metrics and Performance Indicators

> **🇲🇽 Métricas:** *Cómo medir si el equipo Scrum está funcionando bien.*

### Velocity

**Velocity** measures the average number of Story Points a team completes per Sprint over a rolling window (typically 3–5 Sprints). It is used for **forecasting**, not benchmarking.

```
Velocity = Story Points Completed / Sprint
```

### Burndown Chart

A **Sprint Burndown Chart** tracks the remaining work (in Story Points or hours) against time within a Sprint. It provides a visual indication of whether the team is on track to meet the Sprint Goal.

```
Story
Points  ╔══════════════════════════════╗
  30    ║\                             ║  ← Ideal burndown
  25    ║ \         ·                  ║
  20    ║  \    ·                      ║
  15    ║   ·                 ·        ║  ← Actual burndown
  10    ║       ·        ·             ║
   5    ║            ·                 ║
   0    ╚══════════════════════════════╝
        D1  D3  D5  D7  D9  D11  D13 ...
```

### Burnup Chart

A **Burnup Chart** shows work completed versus total scope, making scope changes visible over time.

### Cumulative Flow Diagram (CFD)

The **CFD** displays the quantity of work in each state over time, enabling identification of bottlenecks and flow inefficiencies.

### Lead Time and Cycle Time

| Metric | Definition |
|---|---|
| **Lead Time** | Time from when a backlog item is created to when it is delivered. |
| **Cycle Time** | Time from when work on an item actively begins to when it is delivered. |

---

## Conclusion

> **🇲🇽 Conclusión:** *Resumen final: Scrum funciona porque es simple, flexible y siempre enfocado en entregar valor real.*

Scrum is a deceptively simple framework that demands disciplined execution and a genuine commitment to its underlying values. Its power lies not in the complexity of its rules—which are deliberately minimal—but in the **rigor it imposes on transparency, inspection, and adaptation**.

The information-gathering techniques of **interviews**, **surveys**, **observation**, and **documentary investigation** are essential precursors to meaningful Sprint planning, ensuring that the Product Backlog accurately reflects stakeholder needs. The systematic differentiation between **functional** and **non-functional requirements** provides the analytical foundation upon which the entire development effort rests.

Critically, the principle that **a Sprint is declared complete only when the delivered increment is functional** is not merely a rule of thumb—it is a fundamental expression of the Agile philosophy. Working software is the primary measure of progress. Every Sprint must result in an increment of real, demonstrable, operable value.

Teams that internalize this principle—and build their Definition of Done around it—consistently deliver higher-quality products, accumulate less technical debt, and maintain greater stakeholder trust over the long arc of product development.

---

## References

> **🇲🇽 Referencias:** *Las fuentes oficiales y académicas en las que se basa este documento.*

1. Schwaber, K., & Sutherland, J. (2020). *The Scrum Guide: The Definitive Guide to Scrum: The Rules of the Game*. Scrum.org. https://scrumguides.org/scrum-guide.html

2. Beck, K., et al. (2001). *Manifesto for Agile Software Development*. Agile Alliance. https://agilemanifesto.org/

3. Cohn, M. (2004). *User Stories Applied: For Agile Software Development*. Addison-Wesley Professional.

4. Rubin, K. S. (2012). *Essential Scrum: A Practical Guide to the Most Popular Agile Process*. Addison-Wesley.

5. Pichler, R. (2010). *Agile Product Management with Scrum: Creating Products that Customers Love*. Addison-Wesley.

6. IEEE. (2011). *ISO/IEC/IEEE 29148:2011 — Systems and Software Engineering: Requirements Engineering*. IEEE Standards.

7. Leffingwell, D. (2011). *Agile Software Requirements: Lean Requirements Practices for Teams, Programs, and the Enterprise*. Addison-Wesley.

8. Sutherland, J. (2014). *Scrum: The Art of Doing Twice the Work in Half the Time*. Crown Business.

---

*Document Version: 1.0 | Language: English (Technical/Formal) | Scope: Comprehensive Scrum Methodology Overview*

*© Documentary prepared for educational and professional development purposes.*