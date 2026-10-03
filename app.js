(() => {
    "use strict";

    const root = document.documentElement;
    const themeToggle = document.querySelector(".theme-toggle");
    const themeOrder = ["dark", "light", "purple", "red"];

    function readStorage(key, fallback = "") {
        try {
            return localStorage.getItem(key) ?? fallback;
        } catch {
            return fallback;
        }
    }

    function writeStorage(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch {
            return false;
        }
    }

    function readJSON(key, fallback) {
        try {
            const value = readStorage(key);
            return value ? JSON.parse(value) : fallback;
        } catch {
            return fallback;
        }
    }

    const savedTheme = readStorage("wooclap-theme");
    if (themeOrder.includes(savedTheme)) {
        root.dataset.theme = savedTheme;
    }

    function syncThemeToggle() {
        const currentTheme = root.dataset.theme;
        const currentIndex = themeOrder.indexOf(currentTheme);
        const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
        const labels = { dark: "Light", light: "Purple", purple: "Red", red: "Dark" };
        const icons = { dark: "☼", light: "✦", purple: "◐", red: "◈" };
        const themeNames = { dark: "dark green", light: "light green", purple: "purple", red: "red and black" };

        themeToggle.setAttribute("aria-pressed", String(currentTheme === "purple"));
        themeToggle.setAttribute("aria-label", `Switch to ${themeNames[nextTheme]} theme`);
        themeToggle.querySelector(".theme-label").textContent = labels[currentTheme];
        themeToggle.querySelector(".theme-icon").textContent = icons[currentTheme];

        const themeColors = { dark: "#10130f", light: "#edf3e8", purple: "#120f18", red: "#110d0e" };
        const themeColor = themeColors[currentTheme] || themeColors.dark;
        document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
    }

    syncThemeToggle();
    themeToggle.addEventListener("click", () => {
        const currentIndex = themeOrder.indexOf(root.dataset.theme);
        const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
        root.dataset.theme = nextTheme;
        writeStorage("wooclap-theme", nextTheme);
        syncThemeToggle();
    });

    let progressFrame = 0;
    function updateReadingProgress() {
        if (progressFrame) return;

        progressFrame = requestAnimationFrame(() => {
            progressFrame = 0;
            const scrollableHeight = root.scrollHeight - window.innerHeight;
            const progress = scrollableHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollableHeight)) : 0;
            root.style.setProperty("--page-progress", progress.toFixed(4));
        });
    }

    window.addEventListener("scroll", updateReadingProgress, { passive: true });
    window.addEventListener("resize", updateReadingProgress, { passive: true });
    updateReadingProgress();

    const sectionLinks = [...document.querySelectorAll('.main-nav a[href^="#"]')];
    const observedSections = sectionLinks
        .map(link => ({ link, section: document.querySelector(link.getAttribute("href")) }))
        .filter(item => item.section);

    if ("IntersectionObserver" in window && observedSections.length) {
        const sectionObserver = new IntersectionObserver(entries => {
            const activeEntry = entries
                .filter(entry => entry.isIntersecting)
                .sort((first, second) => Math.abs(first.boundingClientRect.top - window.innerHeight * 0.3) - Math.abs(second.boundingClientRect.top - window.innerHeight * 0.3))[0];
            if (!activeEntry) return;

            observedSections.forEach(({ link, section }) => {
                if (section === activeEntry.target) link.setAttribute("aria-current", "location");
                else link.removeAttribute("aria-current");
            });
        }, { rootMargin: "-20% 0px -62% 0px", threshold: [0, 0.25, 0.5] });

        observedSections.forEach(({ section }) => sectionObserver.observe(section));
    }

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (finePointer.matches && !reducedMotion.matches) {
        document.querySelectorAll(".hero-visual, .feature-card, .price-card").forEach(surface => {
            let frameId = 0;
            let pointerX = 0;
            let pointerY = 0;
            const maxTilt = surface.matches(".hero-visual") ? 4 : 6;

            function resetTilt() {
                if (frameId) cancelAnimationFrame(frameId);
                frameId = 0;
                surface.classList.remove("is-tilting");
                surface.style.setProperty("--tilt-x", "0deg");
                surface.style.setProperty("--tilt-y", "0deg");
                surface.style.setProperty("--pointer-x", "50%");
                surface.style.setProperty("--pointer-y", "50%");
            }

            surface.addEventListener("pointermove", event => {
                pointerX = event.clientX;
                pointerY = event.clientY;
                if (frameId) return;

                frameId = requestAnimationFrame(() => {
                    frameId = 0;
                    const bounds = surface.getBoundingClientRect();
                    if (!bounds.width || !bounds.height) return;

                    const x = Math.max(-0.5, Math.min(0.5, (pointerX - bounds.left) / bounds.width - 0.5));
                    const y = Math.max(-0.5, Math.min(0.5, (pointerY - bounds.top) / bounds.height - 0.5));
                    surface.style.setProperty("--tilt-x", `${(-y * maxTilt * 2).toFixed(2)}deg`);
                    surface.style.setProperty("--tilt-y", `${(x * maxTilt * 2).toFixed(2)}deg`);
                    surface.style.setProperty("--pointer-x", `${((x + 0.5) * 100).toFixed(1)}%`);
                    surface.style.setProperty("--pointer-y", `${((y + 0.5) * 100).toFixed(1)}%`);
                    surface.classList.add("is-tilting");
                });
            }, { passive: true });

            surface.addEventListener("pointerleave", resetTilt, { passive: true });
            surface.addEventListener("pointercancel", resetTilt, { passive: true });
        });
    }

    const sampleAnswers = [...document.querySelectorAll(".sample-answer")];
    const sampleFeedback = document.querySelector("#sample-feedback");
    const sampleScore = document.querySelector("#sample-score");
    const sampleReset = document.querySelector("#sample-reset");
    const savedSampleStats = readJSON("wooclap-sample-stats", { correct: 0, attempts: 0 });
    const sampleStats = {
        correct: Number.isFinite(savedSampleStats.correct) ? savedSampleStats.correct : 0,
        attempts: Number.isFinite(savedSampleStats.attempts) ? savedSampleStats.attempts : 0
    };
    let sampleAnswered = false;

    function renderSampleScore() {
        sampleScore.textContent = `${sampleStats.correct} / ${sampleStats.attempts}`;
    }

    sampleAnswers.forEach(answer => {
        answer.addEventListener("click", () => {
            if (sampleAnswered) return;

            sampleAnswered = true;
            const isCorrect = answer.dataset.correct === "true";
            sampleStats.attempts += 1;
            if (isCorrect) sampleStats.correct += 1;

            sampleAnswers.forEach(option => {
                option.disabled = true;
                const listItem = option.closest("li");
                if (option.dataset.correct === "true") listItem.classList.add("is-correct");
                if (option === answer && !isCorrect) listItem.classList.add("is-wrong");
            });

            sampleFeedback.textContent = isCorrect
                ? "Correct. Mitochondria produce most of the cell's usable energy."
                : "Not quite. Mitochondria produce most of the cell's usable energy.";
            sampleFeedback.className = `sample-feedback ${isCorrect ? "is-correct" : "is-wrong"}`;
            sampleReset.hidden = false;
            writeStorage("wooclap-sample-stats", JSON.stringify(sampleStats));
            renderSampleScore();
        });
    });

    renderSampleScore();
    sampleReset.addEventListener("click", () => {
        sampleAnswered = false;
        sampleAnswers.forEach(answer => {
            answer.disabled = false;
            answer.closest("li").classList.remove("is-correct", "is-wrong");
        });
        sampleFeedback.textContent = "Choose an answer to check your understanding.";
        sampleFeedback.className = "sample-feedback";
        sampleReset.hidden = true;
    });

    const studyDialog = document.querySelector("#study-studio");
    const studyForm = document.querySelector("#study-form");
    const topicInput = document.querySelector("#study-topic");
    const materialInput = document.querySelector("#study-material");
    const languageInput = document.querySelector("#study-language");
    const difficultyInput = document.querySelector("#study-difficulty");
    const studyOutput = document.querySelector("#study-output");
    const buildLabel = document.querySelector("#build-label");
    const modeButtons = [...document.querySelectorAll(".mode-button")];
    const modeSwitch = document.querySelector(".mode-switch");
    const closeStudyButton = document.querySelector(".studio-close");
    const openStudyLinks = [...document.querySelectorAll("[data-open-study]")];
    const localHosts = new Set(["localhost", "127.0.0.1"]);
    const generateEndpoint = localHosts.has(window.location.hostname) && window.location.port !== "3000"
        ? `${window.location.protocol}//${window.location.hostname}:3000/api/generate`
        : "/api/generate";
    let activeMode = "quiz";
    let quizState = null;
    let flashcardState = null;
    let lastOpener = null;
    let activeBuildController = null;
    let buildRunId = 0;

    function cancelBuild() {
        activeBuildController?.abort();
        activeBuildController = null;
        buildRunId += 1;
        studyForm.querySelector(".studio-build").disabled = false;
        studyForm.querySelector('[type="reset"]').disabled = false;
        modeButtons.forEach(button => { button.disabled = false; });
        buildLabel.textContent = `Build ${activeMode === "flashcards" ? "flashcards" : activeMode}`;
    }

    topicInput.value = readStorage("wooclap-study-topic");
    materialInput.value = readStorage("wooclap-study-material");
    const savedLanguage = readStorage("wooclap-study-language", "English");
    languageInput.value = [...languageInput.options].some(option => option.value === savedLanguage) ? savedLanguage : "English";
    const savedDifficulty = readStorage("wooclap-study-difficulty", "easy");
    difficultyInput.value = ["easy", "medium", "hard"].includes(savedDifficulty) ? savedDifficulty : "easy";

    function makeElement(tagName, className, text) {
        const element = document.createElement(tagName);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function makeButton(label, className, onClick) {
        const button = makeElement("button", className, label);
        button.type = "button";
        button.addEventListener("click", onClick);
        return button;
    }

    function setOutputMessage(message, isError = false) {
        studyOutput.replaceChildren(makeElement("p", isError ? "output-empty is-error" : "output-empty", message));
    }

    function setMode(mode) {
        activeMode = mode;
        const indicatorPositions = {
            quiz: "0%",
            notes: "calc(100% + 2px)",
            flashcards: "calc(200% + 4px)"
        };
        modeSwitch.style.setProperty("--indicator-x", indicatorPositions[mode] || "0%");
        modeButtons.forEach(button => {
            const isActive = button.dataset.mode === mode;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
        buildLabel.textContent = `Build ${mode === "flashcards" ? "flashcards" : mode}`;

        if (topicInput.value.trim()) {
            setOutputMessage(`Ready to build ${mode} for ${topicInput.value.trim()}. Press the build button when you are ready.`);
        } else {
            setOutputMessage("Choose a topic, language, difficulty, and activity type to create a study set.");
        }
    }

    modeButtons.forEach(button => button.addEventListener("click", () => setMode(button.dataset.mode)));

    function buildOfflineQuiz(topic, material) {
        const entries = [];
        const seenTerms = new Set();
        const seenDefinitions = new Set();

        material.split(/\r?\n/).forEach(line => {
            const separator = line.indexOf(":");
            if (separator < 1) return;
            const term = line.slice(0, separator).trim();
            const definition = line.slice(separator + 1).trim();
            const termKey = term.toLocaleLowerCase();
            const definitionKey = definition.toLocaleLowerCase();
            if (!term || !definition || seenTerms.has(termKey) || seenDefinitions.has(definitionKey)) return;
            seenTerms.add(termKey);
            seenDefinitions.add(definitionKey);
            entries.push({ term, definition });
        });

        if (entries.length < 2) return null;

        const quizQuestions = entries.slice(0, 6).map(entry => {
            const choices = shuffled([
                entry.definition,
                ...entries.filter(other => other !== entry).map(other => other.definition).slice(0, 3)
            ]);
            return {
                question: `According to your notes, what does ${entry.term} mean?`,
                choices,
                answerIndex: choices.indexOf(entry.definition),
                explanation: `Your notes define ${entry.term} as: ${entry.definition}`
            };
        });

        return {
            explanation: `This practice quiz is built from the ${entries.length} term-definition pairs you entered for ${topic}.`,
            examples: entries.slice(0, 4).map(entry => `${entry.term}: ${entry.definition}`),
            quizQuestions,
            answers: quizQuestions.map((question, index) => ({
                questionIndex: index + 1,
                correctAnswer: question.choices[question.answerIndex],
                explanation: question.explanation
            })),
            flashcards: entries.slice(0, 4).map(entry => ({ front: entry.term, back: entry.definition })),
            isOffline: true
        };
    }

    async function buildActivity() {
        const topic = topicInput.value.trim();
        const material = materialInput.value.trim();
        const requestedMode = activeMode;
        if (!topic) {
            topicInput.focus();
            return;
        }
        writeStorage("wooclap-study-topic", topic);
        writeStorage("wooclap-study-material", material);
        writeStorage("wooclap-study-language", languageInput.value);
        writeStorage("wooclap-study-difficulty", difficultyInput.value);

        if (window.location.protocol === "file:") {
            const offlineBundle = requestedMode === "quiz" ? buildOfflineQuiz(topic, material) : null;
            if (offlineBundle) renderQuiz(topic, offlineBundle);
            else setOutputMessage(requestedMode === "quiz"
                ? "For a notes-only quiz, paste at least two Term: definition facts. For local model generation, start Ollama and server.js, then open http://localhost:3000/quiz.html."
                : "Start Ollama and server.js locally, then open http://localhost:3000/quiz.html to generate this study set.", true);
            return;
        }

        activeBuildController?.abort();
        const controller = new AbortController();
        activeBuildController = controller;
        const currentRunId = ++buildRunId;
        const buildButton = studyForm.querySelector(".studio-build");
        const clearButton = studyForm.querySelector('[type="reset"]');
        buildButton.disabled = true;
        clearButton.disabled = true;
        modeButtons.forEach(button => { button.disabled = true; });
        buildLabel.textContent = "Thinking…";
        setOutputMessage("Your AI study activity is being prepared…");

        try {
            const response = await fetch(generateEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic,
                    language: languageInput.value,
                    difficulty: difficultyInput.value,
                    contentType: requestedMode,
                    material
                }),
                signal: controller.signal
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || `Study request failed (${response.status}).`);
            if (currentRunId !== buildRunId) return;

            if (requestedMode === "notes") {
                renderNotes(topic, result);
            } else if (requestedMode === "quiz" && Array.isArray(result.quizQuestions) && Array.isArray(result.answers)) {
                quizState = null;
                renderQuiz(topic, result);
            } else if (requestedMode === "flashcards" && Array.isArray(result.flashcards)) {
                renderFlashcards(topic, result.flashcards.map(card => ({ term: card.front, definition: card.back })));
            } else {
                throw new Error("The AI returned an unexpected study format. Please try again.");
            }
        } catch (error) {
            if (error.name !== "AbortError" && currentRunId === buildRunId) {
                const offlineBundle = requestedMode === "quiz" ? buildOfflineQuiz(topic, material) : null;
                if (offlineBundle) {
                    renderQuiz(topic, offlineBundle);
                } else {
                    const isConnectionError = error instanceof TypeError;
                    const message = isConnectionError
                        ? requestedMode === "quiz"
                            ? "Local study service unavailable. Paste at least two Term: definition lines for a notes-only quiz, or start Ollama and server.js locally."
                            : "Cannot reach the local study service. Start Ollama and server.js on this computer, then try again."
                        : error.message || "The AI request failed. Please try again.";
                    setOutputMessage(message, true);
                }
            }
        } finally {
            if (currentRunId === buildRunId) {
                activeBuildController = null;
                buildButton.disabled = false;
                clearButton.disabled = false;
                modeButtons.forEach(button => { button.disabled = false; });
                buildLabel.textContent = `Build ${requestedMode === "flashcards" ? "flashcards" : requestedMode}`;
            }
        }
    }

    studyForm.addEventListener("submit", event => {
        event.preventDefault();
        buildActivity();
    });

    studyForm.addEventListener("reset", event => {
        event.preventDefault();
        cancelBuild();
        topicInput.value = "";
        materialInput.value = "";
        languageInput.value = "English";
        difficultyInput.value = "easy";
        writeStorage("wooclap-study-topic", "");
        writeStorage("wooclap-study-material", "");
        writeStorage("wooclap-study-language", "English");
        writeStorage("wooclap-study-difficulty", "easy");
        quizState = null;
        flashcardState = null;
        setMode("quiz");
    });

    topicInput.addEventListener("change", () => writeStorage("wooclap-study-topic", topicInput.value.trim()));
    materialInput.addEventListener("change", () => writeStorage("wooclap-study-material", materialInput.value));
    languageInput.addEventListener("change", () => writeStorage("wooclap-study-language", languageInput.value));
    difficultyInput.addEventListener("change", () => writeStorage("wooclap-study-difficulty", difficultyInput.value));

    function renderNotes(topic, bundle = {}) {
        const key = `wooclap-notes-${encodeURIComponent(topic.toLocaleLowerCase()).slice(0, 80)}`;
        const savedNote = readStorage(key);
        const quizReview = (bundle.quizQuestions || []).map((question, index) => {
            const answer = bundle.answers?.[index];
            return `${index + 1}. ${question.question}\n${question.choices.map((choice, choiceIndex) => `${String.fromCharCode(65 + choiceIndex)}. ${choice}`).join("\n")}\nAnswer: ${answer?.correctAnswer || "See quiz"}\n${answer?.explanation || ""}`;
        });
        const cardReview = (bundle.flashcards || []).map(card => `${card.front}\n${card.back}`);
        const outline = [
            `${topic.toLocaleUpperCase()}\n`,
            "EASY EXPLANATION\n",
            bundle.explanation || "No explanation was returned.",
            "\nEXAMPLES\n",
            ...(bundle.examples || []).map((example, index) => `${index + 1}. ${example}`),
            "\nMULTIPLE-CHOICE QUESTIONS & ANSWERS\n",
            ...quizReview,
            "\nFLASHCARDS\n",
            ...cardReview
        ].join("\n");

        studyOutput.replaceChildren();
        studyOutput.append(makeElement("h3", "output-title", `Study notes: ${topic}`));
        const editor = makeElement("textarea", "studio-input notes-editor");
        editor.setAttribute("aria-label", `Editable study notes for ${topic}`);
        editor.value = savedNote || outline;
        const status = makeElement("p", "study-hint", savedNote ? "Saved notes restored from this browser." : "Locally generated study set. Review it, then save your edits in this browser.");
        const saveButton = makeButton("Save notes", "notes-save", () => {
            const saved = writeStorage(key, editor.value);
            status.textContent = saved ? "Notes saved in this browser." : "Storage is unavailable. Keep this page open to retain your notes.";
        });
        studyOutput.append(editor, saveButton, status);
    }

    function shuffled(values) {
        const result = [...values];
        for (let index = result.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
        }
        return result;
    }

    function renderQuiz(topic, bundle, keepScore = false) {
        if (!Array.isArray(bundle.quizQuestions) || bundle.quizQuestions.length === 0) {
            setOutputMessage("The AI did not return any quiz questions. Please build the quiz again.", true);
            return;
        }

        if (!keepScore || !quizState || quizState.topic !== topic) {
            quizState = {
                topic,
                bundle,
                questions: bundle.quizQuestions,
                index: 0,
                score: 0,
                answered: false,
                recorded: false
            };
        }

        if (quizState.index >= quizState.questions.length) {
            renderQuizResults();
            return;
        }

        const question = quizState.questions[quizState.index];
        const correctAnswer = question.choices[question.answerIndex];
        studyOutput.replaceChildren();
        studyOutput.append(makeElement("h3", "output-title", `Quiz: ${topic}`));
        if (quizState.bundle.isOffline) {
            studyOutput.append(makeElement("p", "study-hint offline-quiz-note", "Notes-only quiz. Start Ollama and server.js locally for generated questions from free-form material."));
        }

        const run = makeElement("div", "quiz-run");
        const top = makeElement("div", "quiz-run-top");
        top.append(
            makeElement("span", "", `Question ${quizState.index + 1} of ${quizState.questions.length}`),
            makeElement("span", "", `Score ${quizState.score}`)
        );
        const progress = makeElement("div", "quiz-run-progress");
        progress.setAttribute("role", "progressbar");
        progress.setAttribute("aria-valuemin", "0");
        progress.setAttribute("aria-valuemax", String(quizState.questions.length));
        progress.setAttribute("aria-valuenow", String(quizState.index + (quizState.answered ? 1 : 0)));
        const progressFill = makeElement("span");
        progressFill.style.width = `${((quizState.index + (quizState.answered ? 1 : 0)) / quizState.questions.length) * 100}%`;
        progress.append(progressFill);
        const prompt = makeElement("h4", "quiz-prompt", question.question);
        const options = makeElement("div", "quiz-options");
        const feedback = makeElement("p", "quiz-feedback", quizState.answered ? "Answer recorded." : "Choose the best definition.");
        const nextButton = makeButton(
            quizState.index === quizState.questions.length - 1 ? "See results" : "Next question",
            "quiz-next",
            () => {
                if (!quizState.answered) return;
                quizState.index += 1;
                quizState.answered = false;
                renderQuiz(topic, quizState.bundle, true);
            }
        );
        nextButton.hidden = !quizState.answered;

        question.choices.forEach((optionText, optionIndex) => {
            const option = makeButton(optionText, "quiz-option", () => {
                if (quizState.answered) return;
                quizState.answered = true;
                const isCorrect = optionIndex === question.answerIndex;
                if (isCorrect) quizState.score += 1;
                option.classList.add(isCorrect ? "is-correct" : "is-wrong");
                [...options.children].forEach((choice, choiceIndex) => {
                    choice.disabled = true;
                    if (choiceIndex === question.answerIndex) choice.classList.add("is-correct");
                });
                feedback.textContent = isCorrect
                    ? `Correct. ${question.explanation}`
                    : `Correct answer: ${correctAnswer}. ${question.explanation}`;
                feedback.classList.add(isCorrect ? "is-correct" : "is-wrong");
                nextButton.hidden = false;
                progress.setAttribute("aria-valuenow", String(quizState.index + 1));
                progressFill.style.width = `${((quizState.index + 1) / quizState.questions.length) * 100}%`;
                top.lastElementChild.textContent = `Score ${quizState.score}`;
            });
            options.append(option);
        });

        run.append(top, progress, prompt, options, feedback, nextButton);
        studyOutput.append(run);
    }

    function renderQuizResults() {
        if (!quizState.recorded) {
            const stats = readJSON("wooclap-study-stats", { quizzes: 0, correct: 0, questions: 0 });
            stats.quizzes = (Number(stats.quizzes) || 0) + 1;
            stats.correct = (Number(stats.correct) || 0) + quizState.score;
            stats.questions = (Number(stats.questions) || 0) + quizState.questions.length;
            writeStorage("wooclap-study-stats", JSON.stringify(stats));
            quizState.recorded = true;
        }

        const percentage = Math.round((quizState.score / quizState.questions.length) * 100);
        studyOutput.replaceChildren();
        studyOutput.append(
            makeElement("h3", "output-title", `Session complete: ${quizState.topic}`),
            makeElement("p", "quiz-result-score", `${quizState.score} of ${quizState.questions.length} correct · ${percentage}%`),
            makeElement("p", "study-hint", "Your results are saved locally. Revisit the notes or run the quiz again to strengthen recall.")
        );
        const answerReview = makeElement("details", "answer-review");
        answerReview.append(makeElement("summary", "", "Review answers"));
        const answerList = makeElement("ol", "answer-review-list");
        quizState.bundle.answers.forEach(answer => {
            const item = makeElement("li");
            item.append(
                makeElement("strong", "", `${answer.questionIndex}. ${answer.correctAnswer}`),
                makeElement("p", "", answer.explanation)
            );
            answerList.append(item);
        });
        answerReview.append(answerList);
        const actions = makeElement("div", "study-actions");
        actions.append(
            makeButton("Try again", "quiz-next", () => renderQuiz(quizState.topic, quizState.bundle)),
            makeButton("Review notes", "study-secondary", () => {
                setMode("notes");
                renderNotes(quizState.topic, quizState.bundle);
            })
        );
        studyOutput.append(answerReview, actions);
    }

    function renderFlashcards(topic, entries) {
        const savedProgress = readJSON("wooclap-flashcard-progress", {});
        const key = encodeURIComponent(topic.toLocaleLowerCase()).slice(0, 80);
        const mastered = new Set(Array.isArray(savedProgress[key]) ? savedProgress[key] : []);
        flashcardState = { topic, entries, index: 0, flipped: false, mastered, key };
        showFlashcard();
    }

    function showFlashcard() {
        const state = flashcardState;
        if (!state) return;
        const entry = state.entries[state.index];
        studyOutput.replaceChildren();
        studyOutput.append(makeElement("h3", "output-title", `Flashcards: ${state.topic}`));

        const top = makeElement("div", "flashcard-top");
        top.append(
            makeElement("span", "", `Card ${state.index + 1} of ${state.entries.length}`),
            makeElement("span", "", `${state.mastered.size} mastered`)
        );
        const face = makeButton(state.flipped ? entry.definition : entry.term, "flashcard-face", () => {
            state.flipped = !state.flipped;
            showFlashcard();
        });
        face.setAttribute("aria-label", state.flipped ? "Show term" : "Flip card to reveal definition");
        const hint = makeElement("p", "study-hint", state.flipped ? "Definition" : "Think of the definition, then reveal it.");
        const actions = makeElement("div", "flashcard-actions");
        const reviewButton = makeButton("Need review", "flashcard-action is-muted", () => markFlashcard(false));
        const knownButton = makeButton("Know it", "flashcard-action", () => markFlashcard(true));
        const previousButton = makeButton("← Previous", "study-secondary", () => moveFlashcard(-1));
        const nextButton = makeButton("Next →", "study-secondary", () => moveFlashcard(1));
        actions.append(reviewButton, knownButton, previousButton, nextButton);
        studyOutput.append(top, face, hint, actions);
    }

    function markFlashcard(isKnown) {
        const state = flashcardState;
        const term = state.entries[state.index].term;
        if (isKnown) state.mastered.add(term);
        else state.mastered.delete(term);
        const savedProgress = readJSON("wooclap-flashcard-progress", {});
        savedProgress[state.key] = [...state.mastered];
        writeStorage("wooclap-flashcard-progress", JSON.stringify(savedProgress));
        state.flipped = true;
        showFlashcard();
    }

    function moveFlashcard(direction) {
        flashcardState.index = (flashcardState.index + direction + flashcardState.entries.length) % flashcardState.entries.length;
        flashcardState.flipped = false;
        showFlashcard();
    }

    function openStudySpace(event) {
        event.preventDefault();
        lastOpener = event.currentTarget;
        if (!studyDialog.open) studyDialog.showModal();
        topicInput.focus();
    }

    openStudyLinks.forEach(link => link.addEventListener("click", openStudySpace));
    closeStudyButton.addEventListener("click", () => studyDialog.close());
    studyDialog.addEventListener("click", event => {
        if (event.target === studyDialog) studyDialog.close();
    });
    studyDialog.addEventListener("close", () => {
        cancelBuild();
        lastOpener?.focus();
    });
})();