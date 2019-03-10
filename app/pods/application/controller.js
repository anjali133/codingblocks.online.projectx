import Controller from '@ember/controller';
import { computed } from '@ember-decorators/object';
import { or, alias } from '@ember-decorators/object/computed';
import { inject as service } from '@ember-decorators/service';

export default class ApplicationController extends Controller {
  @service router
  @computed ('router.currentRouteName')
  get isInsideAttemptRoute () {
    return ['attempt'].includes(this.get('router.currentRouteName').split('.')[0])
  }
  @computed ('router.currentRouteName')
  get isInsidePlayer () {
    return ['player'].includes(this.get('router.currentRouteName').split('.')[0])
  }

  @or('isInsidePlayer', 'isInsideAttemptRoute') hideNav
  @alias('isInsideAttemptRoute') hideFooter
}