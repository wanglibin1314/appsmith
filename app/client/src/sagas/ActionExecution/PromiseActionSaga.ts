import {
  executeActionTriggers,
  executeAppAction,
  TriggerMeta,
} from "sagas/ActionExecution/ActionExecutionSagas";
import { all, call } from "redux-saga/effects";
import { EventType } from "constants/AppsmithActionConstants/ActionConstants";
import log from "loglevel";
import { PromiseActionDescription } from "entities/DataTree/actionTriggers";
import {
  UncaughtAppsmithPromiseError,
  UserCancelledActionExecutionError,
} from "sagas/ActionExecution/errorUtils";

export class TriggerFailureError extends Error {
  error?: Error;
  constructor(reason: string, error?: Error) {
    super(reason);
    this.error = error;
  }
}

export class PluginTriggerFailureError extends TriggerFailureError {
  responseData: unknown[] = [];
  constructor(reason: string, responseData: unknown[]) {
    super(reason);
    this.responseData = responseData;
  }
}

export default function* executePromiseSaga(
  trigger: PromiseActionDescription["payload"],
  eventType: EventType,
  triggerMeta: TriggerMeta,
): any {
  try {
    const responses = yield all(
      trigger.executor.map((executionTrigger) =>
        call(executeActionTriggers, executionTrigger, eventType, triggerMeta),
      ),
    );
    if (trigger.then) {
      if (trigger.then.length) {
        let responseData: unknown[] = [{}];
        if (responses.length === 1) {
          responseData = responses[0];
        }
        const thenArguments = responseData || [{}];
        for (const thenable of trigger.then) {
          responseData = yield call(executeAppAction, {
            dynamicString: thenable,
            event: {
              type: eventType,
            },
            responseData: thenArguments,
            source: triggerMeta.source,
            triggerPropertyName: triggerMeta.triggerPropertyName,
          });
        }
      }
    }
  } catch (e) {
    if (e instanceof UserCancelledActionExecutionError) {
      // Let this pass to finally clause
    } else if (trigger.catch) {
      let responseData = [e.message];
      if (e instanceof PluginTriggerFailureError) {
        responseData = e.responseData;
      }
      const catchArguments = responseData || [{}];

      yield call(executeAppAction, {
        dynamicString: trigger.catch,
        event: {
          type: eventType,
        },
        responseData: catchArguments,
        source: triggerMeta.source,
        triggerPropertyName: triggerMeta.triggerPropertyName,
      });
    } else {
      log.error(e);
      throw new UncaughtAppsmithPromiseError(e.message, triggerMeta, e);
    }
  }

  if (trigger.finally) {
    yield call(executeAppAction, {
      dynamicString: trigger.finally,
      event: {
        type: eventType,
      },
      responseData: [{}],
      source: triggerMeta.source,
      triggerPropertyName: triggerMeta.triggerPropertyName,
    });
  }
}
