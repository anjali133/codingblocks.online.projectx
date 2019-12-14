import Controller from '@ember/controller';
import { restartableTask } from 'ember-concurrency-decorators';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';

export default class Dashboard extends Controller {
  @service api
  @service store
  @service player

  @alias('lastAccessedRun.topRunAttempt.progressPercent')
  progressPercent

  @restartableTask fetchPerformanceStatsTask = function *() {
    return yield this.api.request(`progresses/stats/${this.lastAccessedRun.get('topRunAttempt.id')}`)
  }

  @restartableTask fetchAppliedJobsTask = function *() {
    return yield this.store.query('job', {
      filter: {
        eligibilityStatus: 'applied'
      },
      include: 'company',
      sort: '-postedOn',
      page: {
        limit: 2
      }
    })
  }

  @restartableTask fetchWishlistCoursesTask = function *() {
    return yield this.store.query('user-course-wishlist', {
      include: 'course',
      exclude: 'course.*',
      page: {
        limit: 2
      }
    })
  }

  @restartableTask fetchCoursesTask = function* () {
    return yield this.store.query("run", {
      include: "course,run_attempts",
      enrolled: true,
      page: {
        limit: 5
      }
    });
  }
}
