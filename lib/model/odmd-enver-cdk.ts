import {OdmdBuild} from "./odmd-build";
import {OdmdEnver} from "./odmd-enver";

export abstract class OdmdEnverCdk extends OdmdEnver<OdmdBuild<OdmdEnverCdk>> {

    /**
     * what stacks the enver will generate?
     * different stacknames for different branches, avoid conflicts when all deployed into one region/account
     * especially when dynamic env by branching/tagging
     * stackname has to start with buildId name!!!
     * we need to know stack names to monitor, so no wildcard supported until we run cdk ls
     * Make sure it's consistent
     *
     * idempotent!
     */
    getRevStackNames(): Array<string> {
        const revStr = this.targetRevision.type == 'b' ? this.targetRevision.value : this.targetRevision.toPathPartStr();
        const rt = [`${this.owner.buildId}--${revStr}`];
        return rt.map(n => OdmdEnverCdk.SANITIZE_STACK_NAME(n))
    }

    public static SANITIZE_STACK_NAME(n: string) {
        let sanitized = n.replace(/[^a-zA-Z0-9]/g, '-');
        if (sanitized.startsWith('-')) {
            sanitized = 'A' + sanitized.slice(1);
        }
        if (sanitized.endsWith('-')) {
            sanitized = sanitized.slice(0, -1) + 'Z';
        }
        if (n != sanitized) {
            console.log(`${n} sanitized to ${sanitized}`)
        }
        return sanitized
    }
}
