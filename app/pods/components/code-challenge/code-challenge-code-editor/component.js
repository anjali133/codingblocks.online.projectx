import Component from '@ember/component';
import { action, set } from '@ember/object';
import { alias } from '@ember/object/computed';
import { A } from '@ember/array';
import { task, taskGroup } from 'ember-concurrency-decorators';
import { inject as service } from '@ember/service';

export default class CodeEditor extends Component {
  @service taskPoller
  @service currentUser
  @service api
  @service player
  @service store

  @alias('judgeTaskGroup.lastSuccessful.value') lastResult

  customInputOpen = true
  customInputText = ''
  languageSpecs = A([
    {
      name: "C++",
      code: "cpp",
      mode: "cpp",
      source: ""
    },
    {
      name: "C",
      code: "c",
      mode: "c",
      source: ""
    },
    {
      name: "Python 2.7",
      code: "py2",
      mode: "python",
      source: ""
    },
    {
      name: "Python 3",
      code: "py3",
      mode: "python",
      source: ""
    },
    {
      name: "Node",
      code: "js",
      mode: "javascript",
      source: ""
    },
    {
      name: "Java 8",
      code: "java",
      mode: "java",
      source: ""
    },
    {
      name: "C#",
      code: "csharp",
      mode: "csharp",
      source: ""
    }
  ])

  setCodeStubs() {
    this.problem.solutionStubs.map(stub => {
      const languageSpec = this.languageSpecs.findBy('code', stub.language)
      if (languageSpec.source === '') {
        set(languageSpec, 'source', stub.body)
      }
    })
  }

  didReceiveAttrs() {
    this.selectedLanguage = this.languageSpecs[0]
    this.setCodeStubs()
  }

  @taskGroup({drop: true}) judgeTaskGroup

  @task({group: 'judgeTaskGroup'}) runCodeTask = function *() {
    this.set('api.headers.hackJwt', this.get('currentUser.user.hackJwt'))
    const payload = yield this.api.request("code_challenges/submit", {
      method: "POST",
      data: {
        problemId: this.codeChallenge.get("hbProblemId"),
        custom_input: window.btoa(this.customInputText),
        source: window.btoa(this.selectedLanguage.source),
        language: this.selectedLanguage.code,
      },
    });

    const submissionId = payload.submissionId
    const status = yield this.taskPoller.performPoll(() => this.get("api").request("code_challenges/status/" + submissionId, {
        "method": "GET"
    }), submissionStatus => submissionStatus && submissionStatus['judge-result'] !== null);
    return status['judge-result'];
  }

  @task({group: 'judgeTaskGroup'}) submitCodeTask = function *() {
    const runAttempt = this.store.peekRecord('run-attempt', this.player.runAttemptId)
    this.set('api.headers.hackJwt', this.get('currentUser.user.hackJwt'))
    const payload = yield this.get("api").request("code_challenges/submit", {
      method: "POST",
      data: {
        contestId: runAttempt.get("run.contestId"),
        problemId: this.codeChallenge.get("hbProblemId"),
        language: this.selectedLanguage.code,
        source: window.btoa(this.selectedLanguage.source)
      }
    });

    const submissionId = payload.submissionId
    const status = yield this.taskPoller.performPoll(() => this.get("api").request("code_challenges/status/" + submissionId, {
      "method": "GET"
    }), submissionStatus => submissionStatus && submissionStatus['judge-result'] !== null);

    this.get('api').request('code_challenges/problems',{
      data: {
        contest_id: runAttempt.get("run.contestId"),
        problem_id: this.codeChallenge.get("hbProblemId")
      },
    }).then(async result=>{
      this.set("problemJsonApiPayload", result);
      const payload = JSON.parse(JSON.stringify(result))
      this.get('store').unloadAll('problem')
      later(async() => {
        this.get('store').pushPayload(payload)
        const problem = await this.get('store').peekRecord('problem', code.get('hbProblemId'))
        if (await problem.get('hasLatestSubmissionPassed') && await problem.get('mostSuccessfullSubmission.score') == 100) {
          const progress = await this.get('code.content').get('progress')
          progress.set("status", 'DONE')
          progress.save();
        }
      }, 0)
    })
  
    //invalidate leaderboard cache
    const runId = this.get('run.id')
    yield this.get('api').raw(`/runs/${runId}/leaderboard/invalidate`, {
      method: 'POST',
    })

    return status['judge-result']
  }

  @action
  toggleCustomInput() {
    this.toggleProperty('customInputOpen')
  }

  @action
  selectLanguage(code) {
    const language = this.languageSpecs.findBy('code', code)
    this.set('selectedLanguage', language)
  }
}
